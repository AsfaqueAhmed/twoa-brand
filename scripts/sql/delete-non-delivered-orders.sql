-- DELETE EVERY ORDER THAT IS NOT DELIVERED (irreversible). Run this yourself in
-- the Supabase SQL editor.
--
-- Before running:
--   * Download the export (Admin -> Data Export) if you want a copy of these orders.
--   * An in-database copy of all 10 orders (taken 2026-10-27) already exists in
--     backup_orders_20261027b. Orders placed after that are not in it.
--
-- What it does: removes orders whose status is pending, confirmed,
-- out_for_delivery or cancelled. Their order_notes / order_returns rows are
-- removed automatically (foreign keys cascade). Delivered orders are kept.
-- Stock: orders that are still open hold reserved stock, and deleting them does
-- NOT give it back. At the time of writing, every non-delivered order was
-- cancelled, so no stock is affected. If new open orders appeared since, cancel
-- them from the admin first so their stock is handled the normal way.
--
-- Safety: the transaction aborts and rolls back if any delivered order would be
-- lost, or if any non-delivered order is still left afterwards.

begin;

create temp table _delivered_before on commit drop as
  select count(*)::int as n from orders where status = 'delivered';

delete from orders where status <> 'delivered';

do $$
declare
  before_n int;
  after_n int;
  left_n int;
begin
  select n into before_n from _delivered_before;
  select count(*) into after_n from orders where status = 'delivered';
  select count(*) into left_n from orders where status <> 'delivered';
  if after_n <> before_n or left_n <> 0 then
    raise exception 'Aborted: delivered before=%, after=%, non-delivered left=%', before_n, after_n, left_n;
  end if;
end $$;

commit;
