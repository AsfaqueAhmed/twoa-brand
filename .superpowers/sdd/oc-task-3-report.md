# OC Task 3 report
Commit 5682435. RED: orderEdit.test.ts failed to load (no module), adminOrder.test.ts: "buildAdminOrderItemPayloads is not a function" (1 failed). GREEN: vitest src/features/admin 58/58; npm test 164/164; lint (tsc) clean.
Files: admin/orders/domain/orderEdit.ts(+test), createOrder/domain/adminOrder.ts(+test), firestoreOrdersRepository.ts (adminUpdateOrder), supabase/migrations/20261027000200_admin_update_order.sql (NOT applied).
SQL review (design unchanged), notes:
- Column names (parent_product_size_stock.parent_id/size/stock, orders.promo_code/discount) match init schema; lock-then-check mirrors place_order.
- full join + coalesce handles added/removed keys; null-key rows excluded by where; order by 1,2 gives deterministic lock order across concurrent edits.
- orders row locked FOR UPDATE first, so v_order.items is consistent.
- Doubt: order lines missing quantity (null) would sum to null -> coalesce to 0, harmless. Items without parentProductId/selectedSize (custom) correctly ignored.
- Doubt: size is a non-reserved-ish column alias; fine in Postgres. Coupon decrement/increment silently no-ops if the code does not exist; no usage-limit check on newly applied code (same as spec design).
- p_discount/p_promo_code null overwrite existing values (intentional: caller passes the full desired state).
- security definer + is_admin() guard + revoke from public/anon, grant to authenticated.

## Fix report (review findings on 5682435)
- RED: `vitest run orderEdit.test.ts` -> 3 failed | 3 passed (historical name/image, legacy line parentProductId, re-parent).
- GREEN: orderToDraftLines rebuilt from order-line data; SQL: skip missing stock when delta<0, 'Invalid quantity' guard, legacy-lines comment; repo sends `promoCode?.trim() || null`.
- admin: 61 passed; lint (tsc) clean; npm test: 167 passed (23 files). Migration not applied.
