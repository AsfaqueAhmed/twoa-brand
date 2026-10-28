-- Optional image for a parent product. Additive: existing rows default to empty.

alter table parent_products
  add column image text not null default '';
