-- Product page gallery and feature row. Additive: existing rows get empty defaults,
-- and the catalog reads with select *, so the live storefront is unaffected.

alter table products
  add column gallery text[] not null default '{}',
  add column highlights jsonb not null default '[]';
