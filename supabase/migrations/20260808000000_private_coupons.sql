-- Private promo codes: coupons with is_public = false are never returned by
-- a plain "list coupons" select (enforced at the RLS level, not just in the
-- client), but still work when a customer types the exact code in at
-- checkout via get_coupon_by_code() below.

alter table coupons add column is_public boolean not null default true;

drop policy coupons_public_select on coupons;
create policy coupons_public_select on coupons for select using (is_public = true);
create policy coupons_admin_select on coupons for select using (is_admin());

-- SECURITY DEFINER so a known private code can still be looked up directly
-- (bypassing the is_public RLS restriction above) without exposing the rest
-- of the table — same "get by known ID, not list" pattern as get_guest_order().
create or replace function get_coupon_by_code(p_code text)
returns setof coupons
language sql
security definer
set search_path = public
as $$
  select * from coupons where code = upper(p_code);
$$;

grant execute on function get_coupon_by_code(text) to anon, authenticated;
