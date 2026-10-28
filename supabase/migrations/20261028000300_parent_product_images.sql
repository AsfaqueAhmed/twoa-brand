-- Deploy order: apply this migration and deploy the matching code together.
-- Any `image` edit made by older code between the migration and the deploy leaves `images` stale
-- (the reader prefers `images`). Run this sync right before/at deploy (it only touches rows with 0 or 1 images):
--   update parent_products set images = case when image = '' then '[]'::jsonb else jsonb_build_array(jsonb_build_object('title', coalesce(images->0->>'title','Front'), 'url', image)) end where jsonb_array_length(images) <= 1 and image is distinct from coalesce(images->0->>'url','');

-- Titled images for a parent product: [{ "title": "Front", "url": "https://..." }, ...] in display order.
-- Additive. `image` stays and mirrors the first entry (the admin app writes both), so existing reads are unchanged.
-- NOTE: back up the database before applying.

alter table parent_products
  add column if not exists images jsonb not null default '[]'::jsonb;

-- Backfill: the existing single image becomes the "Front" image.
update parent_products
set images = jsonb_build_array(jsonb_build_object('title', 'Front', 'url', image))
where image <> '' and images = '[]'::jsonb;
