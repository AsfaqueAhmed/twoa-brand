-- Internal admin notes on orders. A separate table (not a column on orders)
-- because customers can read their own order row; notes must stay admin-only.
create table order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index order_notes_order_id_idx on order_notes(order_id, created_at desc);

alter table order_notes enable row level security;
create policy order_notes_admin_all on order_notes for all using (is_admin()) with check (is_admin());
