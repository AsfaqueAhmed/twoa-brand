-- CLEAR ALL STORE DATA (rows only; the schema, policies and functions stay).
--
-- !! IRREVERSIBLE !!  Run this yourself in the Supabase SQL editor, ONLY after:
--   1. you downloaded the full export from Admin -> Data export (JSON), and
--   2. you opened that file and confirmed it contains your products and orders.
--
-- The backup_* tables created earlier (backup_orders_*, backup_products_*, ...)
-- are NOT touched by this script. Images in Supabase Storage are NOT touched.
--
-- Deletes run children-first so foreign keys never block them. A final check
-- aborts and rolls back the whole transaction if any row remains.

begin;

delete from order_notes;
delete from order_returns;
delete from orders;
delete from parent_product_size_stock;
delete from products;
delete from parent_products;
delete from size_charts;
delete from categories;
delete from coupons;
delete from home_banners;

-- Safety check: if any row somehow remains, abort and roll everything back.
do $$
declare remaining int;
begin
  select (select count(*) from order_notes)
       + (select count(*) from order_returns)
       + (select count(*) from orders)
       + (select count(*) from parent_product_size_stock)
       + (select count(*) from products)
       + (select count(*) from parent_products)
       + (select count(*) from size_charts)
       + (select count(*) from categories)
       + (select count(*) from coupons)
       + (select count(*) from home_banners)
  into remaining;
  if remaining <> 0 then
    raise exception 'Aborted: % rows remain, nothing was deleted', remaining;
  end if;
end $$;

commit;
