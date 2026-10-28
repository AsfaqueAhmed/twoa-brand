-- Categories now belong to the parent product. products.category/subcategory
-- remain as a denormalized copy of the parent's values (kept in sync by the
-- admin app on every parent save), so storefront queries are unchanged.
alter table parent_products
  add column if not exists category text not null default '',
  add column if not exists subcategory text;

-- Backfill from the first linked product (no-op on empty tables).
update parent_products pp
set category = coalesce((select p.category from products p where p.parent_product_id = pp.id order by p.id limit 1), ''),
    subcategory = (select p.subcategory from products p where p.parent_product_id = pp.id order by p.id limit 1);
