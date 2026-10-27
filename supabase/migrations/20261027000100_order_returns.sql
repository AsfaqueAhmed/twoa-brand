-- supabase/migrations/20261027000100_order_returns.sql
create table order_returns (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id) on delete cascade,
  reason text not null default '',
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_returns_order_id_idx on order_returns(order_id);

alter table order_returns enable row level security;
create policy order_returns_admin_all on order_returns for all using (is_admin()) with check (is_admin());
