-- Custom tee quote requests.
-- Customers submit a design + contact details (anon, via submit_custom_quote). An admin prices it and sends a
-- one-time checkout link; the customer then places a normal cash-on-delivery order via place_custom_order.
-- NOTE: back up the database before applying.

create table custom_quotes (
  id text primary key,
  name text not null,
  phone text not null,
  whatsapp text not null,
  parent_product_id text not null,
  parent_name text not null default '',
  tee_size text not null,
  color_name text,
  design jsonb not null,
  files jsonb not null default '{"previews":[],"artwork":[]}'::jsonb,
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'ordered', 'declined', 'expired')),
  admin_note text not null default '',
  lines jsonb,
  unit_price numeric,
  quote_token text unique,
  quote_expires_at timestamptz,
  order_id text references orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_quotes_status_created_idx on custom_quotes (status, created_at desc);
create index custom_quotes_phone_created_idx on custom_quotes (phone, created_at desc);

alter table custom_quotes enable row level security;
create policy custom_quotes_admin_all on custom_quotes for all using (is_admin()) with check (is_admin());

-- --- Storage ---
-- Previews are public by URL (mock-ups only); artwork is private (admin read). Anonymous visitors may only INSERT objects
-- named exactly like the client uploads them (see buildQuoteFiles): quotes/CQ-XXXXXXXX/preview-view-<n>.png and
-- quotes/CQ-XXXXXXXX/artwork-<n>.<png|jpg|webp>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('custom-previews', 'custom-previews', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('custom-artwork', 'custom-artwork', false, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy custom_previews_insert on storage.objects for insert
  with check (bucket_id = 'custom-previews' and name ~ '^quotes/CQ-[A-Z0-9]{8}/preview-view-[0-9]{1,2}\.png$');
create policy custom_artwork_insert on storage.objects for insert
  with check (bucket_id = 'custom-artwork' and name ~ '^quotes/CQ-[A-Z0-9]{8}/artwork-[0-9]{1,2}\.(png|jpg|webp)$');
create policy custom_artwork_admin_read on storage.objects for select
  using (bucket_id = 'custom-artwork' and is_admin());
create policy custom_files_admin_delete on storage.objects for delete
  using (bucket_id in ('custom-previews', 'custom-artwork') and is_admin());

-- --- RPCs ---

create or replace function submit_custom_quote(
  p_id text,
  p_name text,
  p_phone text,
  p_whatsapp text,
  p_parent_product_id text,
  p_tee_size text,
  p_color_name text,
  p_design jsonb,
  p_files jsonb,
  p_website text default ''
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Keep digits and at most one leading "+".
  v_phone text := case when btrim(coalesce(p_phone, '')) like '+%' then '+' else '' end || regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_whatsapp text := case when btrim(coalesce(p_whatsapp, '')) like '+%' then '+' else '' end || regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
  v_parent_name text;
  v_phone10 text;
  v_recent int;
  v_recent_all int;
  v_file jsonb;
  v_kind text;
  v_pattern text;
begin
  -- Honeypot: bots fill the hidden field; pretend success without saving anything.
  if coalesce(p_website, '') <> '' then
    return p_id;
  end if;

  if p_id is null or p_id !~ '^CQ-[A-Z0-9]{8}$' then
    raise exception 'Invalid request.';
  end if;
  if length(btrim(coalesce(p_name, ''))) < 2 or length(p_name) > 100 then
    raise exception 'Please enter your name.';
  end if;
  if length(coalesce(p_phone, '')) > 30 or length(coalesce(p_whatsapp, '')) > 30 then
    raise exception 'Please enter a valid phone number.';
  end if;
  if length(coalesce(p_color_name, '')) > 60 then
    raise exception 'Invalid color.';
  end if;
  if length(regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 8 and 15 then
    raise exception 'Please enter a valid phone number.';
  end if;
  if length(regexp_replace(v_whatsapp, '[^0-9]', '', 'g')) not between 8 and 15 then
    raise exception 'Please enter a valid WhatsApp number.';
  end if;
  if p_design is null or jsonb_typeof(p_design) <> 'object' or octet_length(p_design::text) > 300000 then
    raise exception 'Invalid design.';
  end if;
  if p_files is null or jsonb_typeof(p_files) <> 'object' or octet_length(p_files::text) > 20000 then
    raise exception 'Invalid files.';
  end if;

  -- Every referenced file must live under this quote's own folder.
  if jsonb_typeof(coalesce(p_files -> 'previews', '[]'::jsonb)) <> 'array' or jsonb_typeof(coalesce(p_files -> 'artwork', '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid files.';
  end if;
  foreach v_kind in array array['previews', 'artwork']
  loop
    -- Same naming as the storage insert policies and the client's buildQuoteFiles.
    v_pattern := case when v_kind = 'previews'
      then '^quotes/' || p_id || '/preview-view-[0-9]{1,2}\.png$'
      else '^quotes/' || p_id || '/artwork-[0-9]{1,2}\.(png|jpg|webp)$' end;
    for v_file in select * from jsonb_array_elements(coalesce(p_files -> v_kind, '[]'::jsonb))
    loop
      if jsonb_typeof(v_file) <> 'object' or coalesce(v_file ->> 'path', '') !~ v_pattern then
        raise exception 'Invalid file reference.';
      end if;
      if length(coalesce(v_file ->> 'name', '')) > 100 or length(coalesce(v_file ->> 'label', '')) > 100 or length(coalesce(v_file ->> 'viewId', '')) > 100 then
        raise exception 'Invalid file reference.';
      end if;
    end loop;
  end loop;

  select name into v_parent_name from parent_products where id = p_parent_product_id;
  if v_parent_name is null then
    raise exception 'That tee is no longer available.';
  end if;
  if not exists (select 1 from parent_product_size_stock where parent_id = p_parent_product_id and size = p_tee_size) then
    raise exception 'That size is not available.';
  end if;

  -- Serialize the count-then-insert so concurrent requests cannot slip past the caps.
  perform pg_advisory_xact_lock(hashtext('custom_quote_submit'));
  v_phone10 := right(regexp_replace(v_phone, '[^0-9]', '', 'g'), 10);
  select count(*) into v_recent from custom_quotes
  where right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = v_phone10 and created_at > now() - interval '1 hour';
  if v_recent >= 5 then
    raise exception 'Too many requests. Please try again later.';
  end if;
  select count(*) into v_recent_all from custom_quotes where created_at > now() - interval '1 hour';
  if v_recent_all >= 40 then
    raise exception 'Too many requests. Please try again later.';
  end if;

  insert into custom_quotes (id, name, phone, whatsapp, parent_product_id, parent_name, tee_size, color_name, design, files)
  values (p_id, btrim(p_name), v_phone, v_whatsapp, p_parent_product_id, v_parent_name, p_tee_size, nullif(btrim(coalesce(p_color_name, '')), ''), p_design, p_files);

  return p_id;
end;
$$;

-- Admin: set quantities per size, the price per piece and the expiry; returns the checkout token.
create or replace function set_custom_quote_pricing(
  p_id text,
  p_lines jsonb,
  p_unit_price numeric,
  p_expires_at timestamptz,
  p_regenerate boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  q custom_quotes%rowtype;
  line jsonb;
  v_token text;
  v_sizes text[] := '{}';
begin
  if not is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into q from custom_quotes where id = p_id for update;
  if not found then
    raise exception 'Quote not found';
  end if;
  if q.status = 'ordered' then
    raise exception 'This quote has already been ordered.';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add at least one size with a quantity.';
  end if;
  for line in select * from jsonb_array_elements(p_lines)
  loop
    if coalesce((line ->> 'qty')::int, 0) < 1 or (line ->> 'qty')::int > 1000 then
      raise exception 'Invalid quantity.';
    end if;
    if not exists (select 1 from parent_product_size_stock where parent_id = q.parent_product_id and size = line ->> 'size') then
      raise exception 'Unknown size %.', line ->> 'size';
    end if;
    if (line ->> 'size') = any (v_sizes) then
      raise exception 'Each size can only be listed once.';
    end if;
    v_sizes := v_sizes || (line ->> 'size');
  end loop;
  if p_unit_price is null or p_unit_price <= 0 or p_unit_price > 1000000 then
    raise exception 'Enter a valid price per piece.';
  end if;
  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'Choose an expiry in the future.';
  end if;
  if p_expires_at > now() + interval '60 days' then
    raise exception 'Expiry can be at most 60 days from now.';
  end if;

  v_token := q.quote_token;
  if v_token is null or p_regenerate then
    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  end if;

  update custom_quotes
  set lines = p_lines, unit_price = p_unit_price, quote_token = v_token, quote_expires_at = p_expires_at,
      status = 'quoted', updated_at = now()
  where id = p_id;

  return v_token;
end;
$$;

-- Customer: what the checkout link shows. Returns null unless the quote is currently quoted and not expired.
create or replace function get_quote_for_checkout(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', id,
    'name', name,
    'phone', phone,
    'parentProductId', parent_product_id,
    'parentName', parent_name,
    'teeSize', tee_size,
    'colorName', color_name,
    'lines', lines,
    'unitPrice', unit_price,
    'previews', files -> 'previews',
    'expiresAt', quote_expires_at
  )
  from custom_quotes
  where quote_token = p_token and status = 'quoted' and quote_expires_at > now();
$$;

-- Customer: place the COD order for a quote. The price and stock come from the database, never from the browser.
create or replace function place_custom_order(
  p_token text,
  p_order_id text,
  p_user_id text,
  p_user_email text,
  p_name text,
  p_phone text,
  p_address text,
  p_delivery_fee numeric
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  q custom_quotes%rowtype;
  line jsonb;
  v_qty int;
  v_stock int;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_preview text;
  v_item jsonb;
  v_rec record;
  v_uid text := coalesce(auth.uid()::text, 'guest');
begin
  select * into q from custom_quotes where quote_token = p_token for update;
  if not found or q.status <> 'quoted' or q.quote_expires_at is null or q.quote_expires_at <= now() then
    raise exception 'This quote link is no longer valid.';
  end if;

  if q.lines is null or jsonb_typeof(q.lines) <> 'array' or jsonb_array_length(q.lines) = 0 or q.unit_price is null or q.unit_price <= 0 then
    raise exception 'This quote has not been priced yet.';
  end if;
  if length(coalesce(p_user_email, '')) > 200 then
    raise exception 'Invalid email.';
  end if;

  if length(btrim(coalesce(p_name, ''))) < 2 or length(p_name) > 100 then
    raise exception 'Please enter your name.';
  end if;
  if length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) not between 8 and 20 then
    raise exception 'Please enter a valid phone number.';
  end if;
  if length(btrim(coalesce(p_address, ''))) < 5 or length(p_address) > 500 then
    raise exception 'Please enter a valid address.';
  end if;
  if p_delivery_fee is null or p_delivery_fee < 0 or p_delivery_fee > 1000 then
    raise exception 'Invalid delivery fee.';
  end if;
  if p_order_id is null or length(p_order_id) > 60 then
    raise exception 'Invalid order id.';
  end if;

  v_preview := q.files -> 'previews' -> 0 ->> 'path';

  -- Aggregate quantities per size (duplicates can never double-spend stock), lock stock rows in sorted size order,
  -- check every size first, then decrement (same pooled-stock rule as place_order).
  for v_rec in
    select l ->> 'size' as size, sum((l ->> 'qty')::int)::int as qty
    from jsonb_array_elements(q.lines) l
    group by l ->> 'size'
    order by l ->> 'size'
  loop
    select stock into v_stock from parent_product_size_stock
    where parent_id = q.parent_product_id and size = v_rec.size for update;
    if v_stock is null then
      raise exception 'Stock record not found for size %', v_rec.size;
    end if;
    if v_stock < v_rec.qty then
      raise exception 'Only % left in size %. Please contact us to adjust your order.', v_stock, v_rec.size;
    end if;
  end loop;

  for v_rec in
    select l ->> 'size' as size, sum((l ->> 'qty')::int)::int as qty
    from jsonb_array_elements(q.lines) l
    group by l ->> 'size'
    order by l ->> 'size'
  loop
    update parent_product_size_stock set stock = stock - v_rec.qty
    where parent_id = q.parent_product_id and size = v_rec.size;
  end loop;

  for line in select * from jsonb_array_elements(q.lines)
  loop
    v_qty := (line ->> 'qty')::int;
    v_subtotal := v_subtotal + q.unit_price * v_qty;
    v_item := jsonb_build_object(
      'productId', 'custom-' || q.id,
      'name', 'Custom Tee - ' || q.parent_name,
      'price', q.unit_price,
      'quantity', v_qty,
      'selectedSize', line ->> 'size',
      'parentProductId', q.parent_product_id,
      'customQuoteId', q.id,
      'customPreviewPath', v_preview
    );
    if q.color_name is not null then
      v_item := v_item || jsonb_build_object('selectedVariant', jsonb_build_object('id', 'custom-color', 'name', q.color_name));
    end if;
    v_items := v_items || jsonb_build_array(v_item);
  end loop;

  insert into orders (id, user_id, user_name, user_email, address, phone, items, total_amount, promo_code, discount, status, payment_method, created_at, updated_at)
  values (p_order_id, v_uid, btrim(p_name), coalesce(p_user_email, ''), btrim(p_address), btrim(p_phone), v_items, v_subtotal + p_delivery_fee, null, null, 'pending', 'cash_on_delivery', now(), now());

  update custom_quotes set status = 'ordered', order_id = p_order_id, updated_at = now() where id = q.id;

  return p_order_id;
end;
$$;

revoke execute on function set_custom_quote_pricing(text, jsonb, numeric, timestamptz, boolean) from public, anon;
grant execute on function set_custom_quote_pricing(text, jsonb, numeric, timestamptz, boolean) to authenticated;
grant execute on function submit_custom_quote(text, text, text, text, text, text, text, jsonb, jsonb, text) to anon, authenticated;
grant execute on function get_quote_for_checkout(text) to anon, authenticated;
grant execute on function place_custom_order(text, text, text, text, text, text, text, numeric) to anon, authenticated;
