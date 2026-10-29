-- NOTE: back up the database before applying.
-- Free Gallery: admin-managed artwork shown in the custom tee studios (desktop and mobile).
-- Everyone can read active rows; only admins can read hidden rows and write. Images live in the public `gallery` bucket.

create table gallery_artworks (
  id text primary key default ('ga_' || replace(gen_random_uuid()::text, '-', '')),
  title text not null check (length(title) between 1 and 100),
  category text not null default 'General' check (length(category) between 1 and 40),
  image_path text not null,
  aspect numeric not null default 1 check (aspect > 0.05 and aspect < 20),
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gallery_artworks_active_sort_idx on gallery_artworks (active, sort_order, created_at);

alter table gallery_artworks enable row level security;
-- Permissive policies are OR-ed: visitors see active rows, admins see and manage everything.
create policy gallery_artworks_public_read on gallery_artworks for select to anon, authenticated using (active = true);
create policy gallery_artworks_admin_all on gallery_artworks for all using (is_admin()) with check (is_admin());

-- --- Storage ---
-- Public bucket: objects are readable by URL. Only admins may list, upload, replace or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('gallery', 'gallery', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy gallery_admin_select on storage.objects for select
  using (bucket_id = 'gallery' and is_admin());
create policy gallery_admin_insert on storage.objects for insert
  with check (bucket_id = 'gallery' and is_admin());
create policy gallery_admin_update on storage.objects for update
  using (bucket_id = 'gallery' and is_admin()) with check (bucket_id = 'gallery' and is_admin());
create policy gallery_admin_delete on storage.objects for delete
  using (bucket_id = 'gallery' and is_admin());
