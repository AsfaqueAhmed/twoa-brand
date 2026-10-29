-- NOTE: back up the database before applying.
-- Custom quote bundles: one checkout can hold several custom designs. Customers still submit one quote per design;
-- an admin combines quotes of the same customer (same last 10 phone digits) into one bundle. The bundle "lead" keeps its
-- checkout link; members point at the lead via merged_into and their own links stop working.

alter table custom_quotes add column merged_into text references custom_quotes(id) on delete set null;
create index custom_quotes_merged_into_idx on custom_quotes (merged_into) where merged_into is not null;

-- Admin: set the exact list of quotes combined into p_lead_id. Members not listed are released. Empty array = unbundle all.
create or replace function set_custom_quote_bundle(p_lead_id text, p_member_ids text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead custom_quotes%rowtype;
  m custom_quotes%rowtype;
  v_ids text[];
  v_id text;
  v_lead_phone10 text;
begin
  if not is_admin() then
    raise exception 'Not authorized';
  end if;

  select coalesce(array_agg(distinct x order by x), '{}'::text[]) into v_ids
  from unnest(coalesce(p_member_ids, '{}'::text[])) x
  where x is not null;

  if coalesce(array_length(v_ids, 1), 0) > 10 then
    raise exception 'A combined order can include at most 10 other designs.';
  end if;
  if p_lead_id = any (v_ids) then
    raise exception 'A quote cannot be combined with itself.';
  end if;

  -- Lock the lead, the requested members and the current members in sorted id order.
  perform 1 from custom_quotes
  where id = p_lead_id or id = any (v_ids) or merged_into = p_lead_id
  order by id
  for update;

  select * into v_lead from custom_quotes where id = p_lead_id;
  if not found then
    raise exception 'Quote not found';
  end if;
  if v_lead.status = 'ordered' then
    raise exception 'This quote has already been ordered.';
  end if;

  if coalesce(array_length(v_ids, 1), 0) > 0 then
    if v_lead.status <> 'quoted' or v_lead.quote_token is null then
      raise exception 'Generate a link for this quote before combining designs.';
    end if;
    if v_lead.merged_into is not null then
      raise exception 'This quote is part of another combined order.';
    end if;
    if v_lead.lines is null or jsonb_typeof(v_lead.lines) <> 'array' or jsonb_array_length(v_lead.lines) = 0
       or v_lead.unit_price is null or v_lead.unit_price <= 0 then
      raise exception 'This quote has not been priced yet.';
    end if;
    v_lead_phone10 := right(regexp_replace(v_lead.phone, '[^0-9]', '', 'g'), 10);

    foreach v_id in array v_ids
    loop
      select * into m from custom_quotes where id = v_id;
      if not found then
        raise exception 'Quote % not found.', v_id;
      end if;
      if m.status <> 'quoted' then
        raise exception 'Quote % must be quoted before it can be combined.', v_id;
      end if;
      if m.lines is null or jsonb_typeof(m.lines) <> 'array' or jsonb_array_length(m.lines) = 0
         or m.unit_price is null or m.unit_price <= 0 then
        raise exception 'Quote % has not been priced yet.', v_id;
      end if;
      if m.merged_into is not null and m.merged_into <> p_lead_id then
        raise exception 'Quote % is already part of another combined order.', v_id;
      end if;
      if exists (select 1 from custom_quotes where merged_into = v_id) then
        raise exception 'Quote % already combines other designs.', v_id;
      end if;
      if right(regexp_replace(m.phone, '[^0-9]', '', 'g'), 10) <> v_lead_phone10 then
        raise exception 'Quote % belongs to a different phone number.', v_id;
      end if;
    end loop;
  end if;

  update custom_quotes set merged_into = null, updated_at = now()
  where merged_into = p_lead_id and not (id = any (v_ids));

  update custom_quotes set merged_into = p_lead_id, updated_at = now()
  where id = any (v_ids) and merged_into is distinct from p_lead_id;
end;
$$;

-- Admin pricing: unchanged, except a quote combined into another one cannot be priced on its own.
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
  if q.merged_into is not null then
    raise exception 'This quote is part of a combined order. Remove it from the bundle first.';
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

-- Customer: what the checkout link shows, now with the combined designs under 'extras'.
-- Returns null unless the quote is quoted, not expired and not itself merged into another quote.
create or replace function get_quote_for_checkout(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', q.id,
    'name', q.name,
    'phone', q.phone,
    'parentProductId', q.parent_product_id,
    'parentName', q.parent_name,
    'teeSize', q.tee_size,
    'colorName', q.color_name,
    'lines', q.lines,
    'unitPrice', q.unit_price,
    'previews', q.files -> 'previews',
    'expiresAt', q.quote_expires_at,
    'extras', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'parentProductId', m.parent_product_id,
        'parentName', m.parent_name,
        'teeSize', m.tee_size,
        'colorName', m.color_name,
        'lines', m.lines,
        'unitPrice', m.unit_price,
        'previews', m.files -> 'previews'
      ) order by m.created_at, m.id)
      from custom_quotes m
      where m.merged_into = q.id and m.status = 'quoted'
    ), '[]'::jsonb)
  )
  from custom_quotes q
  where q.quote_token = p_token and q.status = 'quoted' and q.quote_expires_at > now() and q.merged_into is null;
$$;

-- Customer: place the COD order for a quote and every design combined into it. Prices and stock come from the
-- database, never from the browser.
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
  m custom_quotes%rowtype;
  line jsonb;
  v_qty int;
  v_stock int;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_preview text;
  v_item jsonb;
  v_rec record;
  v_members int := 0;
  v_phone10 text;
  v_uid text := coalesce(auth.uid()::text, 'guest');
begin
  select * into q from custom_quotes where quote_token = p_token for update;
  if not found or q.status <> 'quoted' or q.quote_expires_at is null or q.quote_expires_at <= now() or q.merged_into is not null then
    raise exception 'This quote link is no longer valid.';
  end if;

  if q.lines is null or jsonb_typeof(q.lines) <> 'array' or jsonb_array_length(q.lines) = 0 or q.unit_price is null or q.unit_price <= 0 then
    raise exception 'This quote has not been priced yet.';
  end if;

  -- Lock and re-check every combined design.
  perform 1 from custom_quotes where merged_into = q.id order by id for update;
  v_phone10 := right(regexp_replace(q.phone, '[^0-9]', '', 'g'), 10);
  for m in select * from custom_quotes where merged_into = q.id order by id
  loop
    v_members := v_members + 1;
    if m.status <> 'quoted'
       or m.lines is null or jsonb_typeof(m.lines) <> 'array' or jsonb_array_length(m.lines) = 0
       or m.unit_price is null or m.unit_price <= 0
       or right(regexp_replace(m.phone, '[^0-9]', '', 'g'), 10) <> v_phone10
       or exists (select 1 from custom_quotes c where c.merged_into = m.id) then
      raise exception 'This bundle changed. Please contact us.';
    end if;
  end loop;
  if v_members > 10 then
    raise exception 'This bundle changed. Please contact us.';
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

  -- Aggregate quantities per (tee, size) across all designs (duplicates can never double-spend stock), lock stock rows
  -- in sorted order, check every row first, then decrement (same pooled-stock rule as place_order).
  for v_rec in
    select x.parent_product_id as parent_id, l ->> 'size' as size, sum((l ->> 'qty')::int)::int as qty
    from custom_quotes x
    cross join lateral jsonb_array_elements(x.lines) l
    where x.id = q.id or x.merged_into = q.id
    group by x.parent_product_id, l ->> 'size'
    order by x.parent_product_id, l ->> 'size'
  loop
    select stock into v_stock from parent_product_size_stock
    where parent_id = v_rec.parent_id and size = v_rec.size for update;
    if v_stock is null then
      raise exception 'Stock record not found for size %', v_rec.size;
    end if;
    if v_stock < v_rec.qty then
      raise exception 'Only % left in size %. Please contact us to adjust your order.', v_stock, v_rec.size;
    end if;
  end loop;

  for v_rec in
    select x.parent_product_id as parent_id, l ->> 'size' as size, sum((l ->> 'qty')::int)::int as qty
    from custom_quotes x
    cross join lateral jsonb_array_elements(x.lines) l
    where x.id = q.id or x.merged_into = q.id
    group by x.parent_product_id, l ->> 'size'
    order by x.parent_product_id, l ->> 'size'
  loop
    update parent_product_size_stock set stock = stock - v_rec.qty
    where parent_id = v_rec.parent_id and size = v_rec.size;
  end loop;

  -- Lead first, then the combined designs in the order they were requested.
  for m in
    select * from custom_quotes
    where id = q.id or merged_into = q.id
    order by (id <> q.id), created_at, id
  loop
    v_preview := m.files -> 'previews' -> 0 ->> 'path';
    for line in select * from jsonb_array_elements(m.lines)
    loop
      v_qty := (line ->> 'qty')::int;
      v_subtotal := v_subtotal + m.unit_price * v_qty;
      v_item := jsonb_build_object(
        'productId', 'custom-' || m.id,
        'name', 'Custom Tee - ' || m.parent_name,
        'price', m.unit_price,
        'quantity', v_qty,
        'selectedSize', line ->> 'size',
        'parentProductId', m.parent_product_id,
        'customQuoteId', m.id,
        'customPreviewPath', v_preview
      );
      if m.color_name is not null then
        v_item := v_item || jsonb_build_object('selectedVariant', jsonb_build_object('id', 'custom-color', 'name', m.color_name));
      end if;
      v_items := v_items || jsonb_build_array(v_item);
    end loop;
  end loop;

  insert into orders (id, user_id, user_name, user_email, address, phone, items, total_amount, promo_code, discount, status, payment_method, created_at, updated_at)
  values (p_order_id, v_uid, btrim(p_name), coalesce(p_user_email, ''), btrim(p_address), btrim(p_phone), v_items, v_subtotal + p_delivery_fee, null, null, 'pending', 'cash_on_delivery', now(), now());

  update custom_quotes set status = 'ordered', order_id = p_order_id, updated_at = now()
  where id = q.id or merged_into = q.id;

  return p_order_id;
end;
$$;

revoke execute on function set_custom_quote_bundle(text, text[]) from public, anon;
grant execute on function set_custom_quote_bundle(text, text[]) to authenticated;
revoke execute on function set_custom_quote_pricing(text, jsonb, numeric, timestamptz, boolean) from public, anon;
grant execute on function set_custom_quote_pricing(text, jsonb, numeric, timestamptz, boolean) to authenticated;
grant execute on function get_quote_for_checkout(text) to anon, authenticated;
grant execute on function place_custom_order(text, text, text, text, text, text, text, numeric) to anon, authenticated;
