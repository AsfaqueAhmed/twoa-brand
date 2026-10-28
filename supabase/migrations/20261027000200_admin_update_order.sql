-- Admin-only: edit an order's customer details, items and pricing.
-- p_items NULL keeps the existing items. Items may only change while the
-- order is pending/confirmed; stock is adjusted by the net per-size delta.
-- NOTE: lines without parentProductId/selectedSize (custom and legacy lines)
-- are never stock-adjusted.
create or replace function admin_update_order(
  p_order_id text,
  p_user_name text,
  p_phone text,
  p_address text,
  p_items jsonb,
  p_total_amount numeric,
  p_promo_code text,
  p_discount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_line record;
  v_current int;
begin
  if not is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if p_items is not null then
    if v_order.status not in ('pending', 'confirmed') then
      raise exception 'Items can only be changed while the order is pending or confirmed';
    end if;

    if exists (select 1 from jsonb_array_elements(p_items) i where coalesce((i ->> 'quantity')::int, 0) < 1) then
      raise exception 'Invalid quantity';
    end if;

    for v_line in
      with old_l as (
        select i ->> 'parentProductId' as parent_id, i ->> 'selectedSize' as size, sum((i ->> 'quantity')::int) as qty
        from jsonb_array_elements(v_order.items) i
        where (i ->> 'parentProductId') is not null and (i ->> 'selectedSize') is not null
        group by 1, 2
      ), new_l as (
        select i ->> 'parentProductId' as parent_id, i ->> 'selectedSize' as size, sum((i ->> 'quantity')::int) as qty
        from jsonb_array_elements(p_items) i
        where (i ->> 'parentProductId') is not null and (i ->> 'selectedSize') is not null
        group by 1, 2
      )
      select coalesce(n.parent_id, o.parent_id) as parent_id,
             coalesce(n.size, o.size) as size,
             coalesce(n.qty, 0) - coalesce(o.qty, 0) as delta
      from new_l n full join old_l o on n.parent_id = o.parent_id and n.size = o.size
      where coalesce(n.qty, 0) - coalesce(o.qty, 0) <> 0
      order by 1, 2
    loop
      select stock into v_current from parent_product_size_stock
      where parent_id = v_line.parent_id and size = v_line.size for update;

      if v_current is null and v_line.delta < 0 then
        continue; -- parent product was deleted; restoring stock to nothing must not block the edit
      end if;
      if v_current is null then
        raise exception 'Stock record not found for %/%', v_line.parent_id, v_line.size;
      end if;
      if v_line.delta > 0 and v_current < v_line.delta then
        raise exception 'Only % left in size %. Please adjust the order.', v_current, v_line.size;
      end if;

      update parent_product_size_stock set stock = stock - v_line.delta
      where parent_id = v_line.parent_id and size = v_line.size;
    end loop;
  end if;

  if p_promo_code is distinct from v_order.promo_code then
    if v_order.promo_code is not null then
      update coupons set usage_count = greatest(usage_count - 1, 0), updated_at = now() where code = upper(v_order.promo_code);
    end if;
    if p_promo_code is not null then
      update coupons set usage_count = usage_count + 1, updated_at = now() where code = upper(p_promo_code);
    end if;
  end if;

  update orders set
    user_name = p_user_name,
    phone = p_phone,
    address = p_address,
    items = coalesce(p_items, items),
    total_amount = p_total_amount,
    promo_code = p_promo_code,
    discount = p_discount,
    updated_at = now()
  where id = p_order_id;
end;
$$;

revoke all on function admin_update_order(text, text, text, text, jsonb, numeric, text, numeric) from public, anon;
grant execute on function admin_update_order(text, text, text, text, jsonb, numeric, text, numeric) to authenticated;
