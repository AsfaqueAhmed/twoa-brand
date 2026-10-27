-- Public order lookup for the Track Order page: order number + phone.
-- The order number is the last 8 characters of the order id (uppercased), as
-- displayed to customers. Phones are compared on their last 10 digits so
-- "01712 345678" and "+8801712345678" match. A miss returns no rows, so the
-- caller cannot tell whether the number or the phone was wrong.
create or replace function track_order(p_order_number text, p_phone text)
returns setof orders
language sql
security definer
set search_path = public
as $$
  select *
  from orders
  where length(trim(p_order_number)) = 8
    and upper(right(id, 8)) = upper(trim(p_order_number))
    and length(regexp_replace(p_phone, '\D', '', 'g')) >= 8
    and right(regexp_replace(phone, '\D', '', 'g'), 10) = right(regexp_replace(p_phone, '\D', '', 'g'), 10)
  order by created_at desc
  limit 1;
$$;

grant execute on function track_order(text, text) to anon, authenticated;
