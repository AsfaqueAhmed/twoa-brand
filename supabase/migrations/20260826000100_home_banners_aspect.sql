-- Per-banner desktop aspect ratio (width / height), chosen in the admin form.
-- Default 2.6667 (16:6) keeps the previous fixed shape.

alter table home_banners
  add column desktop_aspect numeric(6,4) not null default 2.6667
  check (desktop_aspect >= 1 and desktop_aspect <= 6);
