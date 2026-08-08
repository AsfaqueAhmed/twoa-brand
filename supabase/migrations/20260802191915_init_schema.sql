-- Schema mirrors the current Firestore collections 1:1, preserving existing
-- document IDs as text primary keys (guest order IDs are already embedded as
-- access tokens in real users' browser localStorage; product/category/
-- sizeChart/parentProduct IDs are cross-referenced elsewhere).

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'email') = 'asfaqueahmedsakkar@gmail.com', false);
$$;

create table parent_products (
  id text primary key,
  name text not null,
  size_order text[] not null default '{}'
);

create table parent_product_size_stock (
  parent_id text not null references parent_products(id) on delete cascade,
  size text not null,
  stock int not null default 0,
  primary key (parent_id, size)
);

create table categories (
  id text primary key,
  name text not null,
  subcategories text[] not null default '{}'
);

create table size_charts (
  id text primary key,
  name text not null,
  columns text[] not null default '{}',
  rows jsonb not null default '[]'
);

create table products (
  id text primary key,
  name text not null,
  description text not null default '',
  price numeric not null,
  original_price numeric,
  image_url text,
  category text not null,
  subcategory text,
  rating numeric not null default 0,
  parent_product_id text references parent_products(id),
  variants jsonb,
  size_chart_id text references size_charts(id)
);

create index products_category_idx on products(category);
create index products_parent_product_id_idx on products(parent_product_id);

create table coupons (
  code text primary key,
  discount_type text not null check (discount_type in ('percentage', 'flat', 'free_shipping')),
  value numeric not null default 0,
  min_order_subtotal numeric,
  district_restriction text,
  expires_at timestamptz,
  usage_limit int,
  usage_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- `items` keeps OrderItem snapshots (incl. an image_url copied from the
-- product at order time) as jsonb, same denormalized shape Firestore used.
create table orders (
  id text primary key,
  user_id text not null,
  user_name text not null,
  user_email text not null default '',
  address text not null,
  phone text not null,
  items jsonb not null,
  total_amount numeric not null,
  promo_code text,
  discount numeric,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled')),
  payment_method text not null default 'cash_on_delivery',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_id_idx on orders(user_id);
create index orders_user_email_idx on orders(user_email);

-- --- Row Level Security ---

alter table parent_products enable row level security;
create policy parent_products_public_select on parent_products for select using (true);
create policy parent_products_admin_write on parent_products for all using (is_admin()) with check (is_admin());

alter table parent_product_size_stock enable row level security;
create policy pps_public_select on parent_product_size_stock for select using (true);
create policy pps_admin_write on parent_product_size_stock for all using (is_admin()) with check (is_admin());

alter table categories enable row level security;
create policy categories_public_select on categories for select using (true);
create policy categories_admin_write on categories for all using (is_admin()) with check (is_admin());

alter table size_charts enable row level security;
create policy size_charts_public_select on size_charts for select using (true);
create policy size_charts_admin_write on size_charts for all using (is_admin()) with check (is_admin());

alter table products enable row level security;
create policy products_public_select on products for select using (true);
create policy products_admin_write on products for all using (is_admin()) with check (is_admin());

alter table coupons enable row level security;
create policy coupons_public_select on coupons for select using (true);
create policy coupons_admin_write on coupons for all using (is_admin()) with check (is_admin());

-- No public/guest select policy: a guest fetches a single order only through
-- get_guest_order() below (RLS can't express "get by known ID" vs "list",
-- and a direct policy would let anyone enumerate every guest order).
-- No insert policy at all: orders are only ever created via place_order()
-- so stock reservation + order insert + coupon usage stay atomic.
alter table orders enable row level security;
create policy orders_owner_select on orders for select using (
  is_admin() or auth.uid()::text = user_id or (auth.jwt() ->> 'email') = user_email
);
create policy orders_admin_write on orders for all using (is_admin()) with check (is_admin());

-- --- RPCs ---
-- SECURITY DEFINER functions run as their owner (postgres, which has
-- BYPASSRLS on Supabase), so they can atomically touch tables that have no
-- public write policy at all.

-- p_cart_lines must already be aggregated by (parent_id, size) by the
-- caller (duplicate lines for the same size would each validate against the
-- same pre-decrement stock snapshot and jointly overdraw it).
create or replace function place_order(
  p_order_id text,
  p_user_id text,
  p_user_name text,
  p_user_email text,
  p_address text,
  p_phone text,
  p_items jsonb,
  p_total_amount numeric,
  p_promo_code text,
  p_discount numeric,
  p_cart_lines jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  line jsonb;
  current_stock int;
begin
  for line in select * from jsonb_array_elements(p_cart_lines)
  loop
    select stock into current_stock
    from parent_product_size_stock
    where parent_id = (line ->> 'parent_id') and size = (line ->> 'size')
    for update;

    if current_stock is null then
      raise exception 'Stock record not found for %/%', line ->> 'parent_id', line ->> 'size';
    end if;

    if current_stock < (line ->> 'qty')::int then
      raise exception 'Only % left in size %. Please adjust your cart.', current_stock, line ->> 'size';
    end if;
  end loop;

  for line in select * from jsonb_array_elements(p_cart_lines)
  loop
    update parent_product_size_stock
    set stock = stock - (line ->> 'qty')::int
    where parent_id = (line ->> 'parent_id') and size = (line ->> 'size');
  end loop;

  insert into orders (id, user_id, user_name, user_email, address, phone, items, total_amount, promo_code, discount, status, payment_method, created_at, updated_at)
  values (p_order_id, p_user_id, p_user_name, p_user_email, p_address, p_phone, p_items, p_total_amount, p_promo_code, p_discount, 'pending', 'cash_on_delivery', now(), now());

  if p_promo_code is not null then
    update coupons set usage_count = usage_count + 1, updated_at = now() where code = upper(p_promo_code);
  end if;
end;
$$;

create or replace function get_guest_order(p_order_id text)
returns setof orders
language sql
security definer
set search_path = public
as $$
  select * from orders where id = p_order_id and user_id = 'guest';
$$;

create or replace function cancel_order(p_order_id text, p_requester_user_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner text;
  v_status text;
begin
  select user_id, status into v_owner, v_status from orders where id = p_order_id for update;

  if v_owner is null then
    raise exception 'Order not found';
  end if;

  if v_owner <> 'guest' and v_owner <> p_requester_user_id then
    raise exception 'Not authorized to cancel this order';
  end if;

  if v_status in ('delivered', 'cancelled') then
    raise exception 'Order cannot be cancelled from status %', v_status;
  end if;

  update orders set status = 'cancelled', updated_at = now() where id = p_order_id;
end;
$$;

grant execute on function place_order(text, text, text, text, text, text, jsonb, numeric, text, numeric, jsonb) to anon, authenticated;
grant execute on function get_guest_order(text) to anon, authenticated;
grant execute on function cancel_order(text, text) to anon, authenticated;

-- --- Storage ---
-- Product/order images move here from embedded base64. Public read (mirrors
-- Firestore's public-read catalog); only the admin can write, matching
-- products/parentProducts write rules. The one-off Firestore migration
-- script uses the service_role key, which bypasses these policies entirely.

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

create policy images_public_read on storage.objects for select using (bucket_id = 'images');
create policy images_admin_insert on storage.objects for insert with check (bucket_id = 'images' and is_admin());
create policy images_admin_update on storage.objects for update using (bucket_id = 'images' and is_admin());
create policy images_admin_delete on storage.objects for delete using (bucket_id = 'images' and is_admin());
