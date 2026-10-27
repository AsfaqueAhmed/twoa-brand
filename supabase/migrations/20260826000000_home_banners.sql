-- Admin-managed home page hero banners. Public can read only active rows;
-- the admin (is_admin()) can do everything. Images live in the existing
-- 'images' storage bucket under banners/.

create table home_banners (
  id uuid primary key default gen_random_uuid(),
  position int not null default 0,
  is_active boolean not null default true,
  desktop_image_url text not null,
  mobile_image_url text,
  eyebrow text not null default '',
  headline text not null default '',
  subtext text not null default '',
  cta_label text not null default '',
  cta_href text not null default '',
  created_at timestamptz not null default now()
);

alter table home_banners enable row level security;

create policy home_banners_public_select on home_banners for select using (is_active = true);
create policy home_banners_admin_all on home_banners for all using (is_admin()) with check (is_admin());
