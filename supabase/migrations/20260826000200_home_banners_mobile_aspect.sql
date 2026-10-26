-- Per-banner mobile aspect ratio (width / height), chosen in the admin form.
-- Default 0.8 (4:5) keeps the previous fixed shape.

alter table home_banners
  add column mobile_aspect numeric(6,4) not null default 0.8
  check (mobile_aspect >= 0.5 and mobile_aspect <= 2);
