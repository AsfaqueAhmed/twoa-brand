-- Product visibility (hide from the storefront) and a featured flag.
alter table products
  add column is_active boolean not null default true,
  add column is_featured boolean not null default false;

-- Public (anon/customer) reads only see active products; the admin sees all.
drop policy if exists products_public_select on products;
create policy products_public_select on products for select using (is_active or is_admin());
