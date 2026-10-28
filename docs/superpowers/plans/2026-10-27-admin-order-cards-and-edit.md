# Admin Order Cards + Edit Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the All Orders cards with compact expandable cards (status dropdown, pricing breakdown, Edit button) and add an Edit Order page that can change customer details, items and pricing.

**Architecture:** Pure helpers in `src/features/admin/orders/domain/` (tested) feed new card components. Editing reuses the Create Order building blocks (`ItemsCard`, `adminOrderTotal`, `buildAdminOrderItems` helpers) and persists through one new security-definer SQL function, `admin_update_order`, which adjusts stock by the net delta atomically.

**Tech Stack:** Next.js 15 (static export), React 19, Tailwind 4, lucide-react, Supabase JS, vitest.

## Global Constraints

- Work stays on branch `feat/admin-redesign`. Never merge or push to main.
- `next.config.ts` has `output: 'export'`: no dynamic `[id]` routes; the edit page is `/admin/orders/edit?id=<orderId>` and reads the id with `useSearchParams` inside a `<Suspense>` boundary.
- Storefront `Navbar` is NOT modified. No new npm dependencies.
- Delivery fee is not stored; derive it as `total - subtotal + discount` (never below 0).
- Items are editable only when status is `pending` or `confirmed`.
- The migration is only WRITTEN by implementers. A backup is taken and the user's go-ahead is obtained by the controller before it is applied. Backup tables (if used) MUST have row level security enabled with no policies.
- Each task ends green on `npm run lint` and `npm test`, in its own commit; messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Pages render inside the admin shell: never render Navbar/RequireAdmin.

## File Structure

- Create `src/features/admin/orders/domain/orderView.ts` (+ test).
- Create `src/features/admin/orders/presentation/{OrderStatusMenu,AdminOrderCard}.tsx`; modify `AdminOrderManager.tsx` to render them.
- Create `src/features/admin/orders/domain/orderEdit.ts` (+ test); modify `src/features/admin/createOrder/domain/adminOrder.ts` (export `buildAdminOrderItemPayloads`).
- Create `supabase/migrations/20261027000200_admin_update_order.sql`; modify `src/features/orders/infrastructure/firestoreOrdersRepository.ts` (add `adminUpdateOrder`).
- Create `src/features/admin/orders/presentation/EditOrderPage.tsx`, `src/app/admin/orders/edit/page.tsx`; add the Edit button to `AdminOrderCard.tsx`.

---

### Task 1: Order view helpers (TDD)

**Files:**
- Create: `src/features/admin/orders/domain/orderView.ts`, `orderView.test.ts`

**Interfaces:**
- Produces:
  - `shortOrderId(id: string): string` → `#` + last 8 chars
  - `orderItemCount(order: Order): number` (sum of quantities)
  - `orderBreakdown(order: Order): { subtotal: number; discount: number; deliveryFee: number; total: number }`
  - `canEditItems(status: OrderStatus): boolean`

- [ ] **Step 1: Failing test**

```ts
// src/features/admin/orders/domain/orderView.test.ts
import { describe, it, expect } from 'vitest';
import type { Order } from '@/shared/domain/types';
import { shortOrderId, orderItemCount, orderBreakdown, canEditItems } from './orderView';

const order = (over: Partial<Order> = {}): Order => ({
  id: 'ord_fdd133de9b04b8e61a13', userId: 'guest', userName: 'A', userEmail: '', address: 'x', phone: '017',
  items: [
    { productId: 'p1', name: 'Tee', price: 320, quantity: 1, image: '' },
    { productId: 'p2', name: 'Tee2', price: 320, quantity: 1, image: '' },
  ],
  totalAmount: 710, status: 'pending', paymentMethod: 'cash_on_delivery',
  createdAt: '2026-10-27T13:49:44', updatedAt: '2026-10-27T13:49:44', ...over,
});

describe('shortOrderId', () => {
  it('returns # plus the last 8 characters', () => expect(shortOrderId('ord_fdd133de9b04b8e61a13')).toBe('#b8e61a13'));
});

describe('orderItemCount', () => {
  it('sums quantities', () => {
    expect(orderItemCount(order())).toBe(2);
    expect(orderItemCount(order({ items: [{ productId: 'p', name: 'n', price: 1, quantity: 3, image: '' }] }))).toBe(3);
  });
});

describe('orderBreakdown', () => {
  it('derives delivery fee from total, subtotal and discount', () => {
    expect(orderBreakdown(order())).toEqual({ subtotal: 640, discount: 0, deliveryFee: 70, total: 710 });
    expect(orderBreakdown(order({ discount: 100, totalAmount: 610 }))).toEqual({ subtotal: 640, discount: 100, deliveryFee: 70, total: 610 });
  });
  it('never returns a negative delivery fee', () => {
    expect(orderBreakdown(order({ totalAmount: 500 })).deliveryFee).toBe(0);
  });
});

describe('canEditItems', () => {
  it('is true only for pending and confirmed', () => {
    expect(canEditItems('pending')).toBe(true);
    expect(canEditItems('confirmed')).toBe(true);
    expect(canEditItems('out_for_delivery')).toBe(false);
    expect(canEditItems('delivered')).toBe(false);
    expect(canEditItems('cancelled')).toBe(false);
  });
});
```

Run: `npx vitest run src/features/admin/orders/domain` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement**

```ts
// src/features/admin/orders/domain/orderView.ts
import type { Order, OrderStatus } from '@/shared/domain/types';

export function shortOrderId(id: string): string {
  return `#${id.slice(-8)}`;
}

export function orderItemCount(order: Order): number {
  return order.items.reduce((n, i) => n + i.quantity, 0);
}

export function orderBreakdown(order: Order): { subtotal: number; discount: number; deliveryFee: number; total: number } {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = order.discount ?? 0;
  const deliveryFee = Math.max(0, Math.round((order.totalAmount - subtotal + discount) * 100) / 100);
  return { subtotal, discount, deliveryFee, total: order.totalAmount };
}

export function canEditItems(status: OrderStatus): boolean {
  return status === 'pending' || status === 'confirmed';
}
```

- [ ] **Step 3: Verify and commit**

Run: `npx vitest run src/features/admin/orders/domain && npm run lint && npm test` — Expected: PASS, tsc clean.

```bash
git add src/features/admin/orders/domain
git commit -m "feat(admin): order view helpers (short id, breakdown, edit rules)"
```

---

### Task 2: New compact order cards

**Files:**
- Create: `src/features/admin/orders/presentation/OrderStatusMenu.tsx`, `AdminOrderCard.tsx`
- Modify: `src/features/admin/orders/presentation/AdminOrderManager.tsx`

**Interfaces:**
- Consumes (Task 1): `shortOrderId`, `orderItemCount`, `orderBreakdown`. Existing: `STATUS_LABELS`, `STATUS_ORDER` (`@/features/admin/analytics/domain/analytics`), `formatCurrency`, `Order`, `OrderStatus`.
- Produces: `<OrderStatusMenu status onChange />`, `<AdminOrderCard order onStatusChange />` (default exports).

Requirements (read the current `AdminOrderManager.tsx` first; keep its search box, status filter tabs, loading/empty states, `refreshOrders`, `handleAdminUpdateOrderStatus`, `alert('Failed to update status.')` behavior and the element ids `admin-order-search` and `admin-order-row-<id>`):

- `OrderStatusMenu` (`'use client'`): a rounded-full status tag (colors per status as in the existing `getStatusStyle`, label from `STATUS_LABELS`) followed by a small pencil button (`Pencil` icon, `aria-label="Change status"`, `aria-haspopup="menu"`, `aria-expanded`) that toggles a small dropdown listing the 5 statuses from `STATUS_ORDER` (current one has a check mark). Choosing one calls `onChange(status)` and closes the menu; clicking outside or pressing Escape closes it. Absolute-positioned menu with `z-20`.
- `AdminOrderCard` (`'use client'`, keeps its own `expanded` state, default collapsed): outer `<div id={\`admin-order-row-${order.id}\`}` rounded-lg white card with `border-[#EEEEEE]`. Collapsed row (flex, wraps on narrow screens): `shortOrderId` (mono, bold), `OrderStatusMenu`, customer name + phone, a stack of up to 3 overlapping 28px item thumbnails (`order.items[n].image`; skip `<img>` for empty image) with "N items" (`orderItemCount`), date (`toLocaleString`), total (`formatCurrency`), and an expand/collapse chevron button (`aria-expanded`). Guest orders show a small "Guest" tag. Expanded section below a divider: the full address (labelled "Delivery address — Cash on Delivery"), customer email (or "— (guest, no email)"), the item list (thumb, name × qty, variant/size tags, line total, no max-height cap), and a pricing breakdown card from `orderBreakdown`: Subtotal, Delivery fee, Discount (with coupon code `order.promoCode` when present, shown only when discount > 0), Total, and a "Pay on Delivery" tag. All badges/tags/buttons use rounded corners (`rounded-full` for tags, `rounded-md` for buttons).
- `AdminOrderManager`: replace the big inline card markup with `<AdminOrderCard key={ord.id} order={ord} onStatusChange={(s) => handleAdminUpdateOrderStatus(ord.id, s)} />`; spacing `space-y-3`. Round the status filter tabs' remaining square elements if any. No Edit button yet (Task 4).

- [ ] **Step 1:** Implement the two components and refactor the manager.
- [ ] **Step 2:** Run `npm run lint && npm test && npx next build`. Expected: clean; build lists `/admin/orders`. Admin sign-in is Google OAuth so the cards cannot be exercised in the agent's browser; say so in the report.
- [ ] **Step 3: Commit**

```bash
git add src/features/admin/orders
git commit -m "feat(admin): compact expandable order cards with status menu"
```

---

### Task 3: Edit helpers + admin_update_order function

**Files:**
- Create: `src/features/admin/orders/domain/orderEdit.ts`, `orderEdit.test.ts`
- Modify: `src/features/admin/createOrder/domain/adminOrder.ts` (+ its test file), `src/features/orders/infrastructure/firestoreOrdersRepository.ts`
- Create: `supabase/migrations/20261027000200_admin_update_order.sql` (WRITE ONLY — do not apply)

**Interfaces:**
- Consumes: `DraftLine`, `buildAdminOrderItems`, `newCustomItemId` from `adminOrder.ts`; `Order`, `OrderItem`, `Product`, `CartItem`.
- Produces:
  - In `adminOrder.ts`: `buildAdminOrderItemPayloads(lines: DraftLine[]): Record<string, any>[]` (the items mapping half of `buildAdminOrderItems`, which must now call it; existing tests unchanged and green).
  - `orderToDraftLines(order: Order, products: Product[]): DraftLine[]`: for each order item: if `productId` starts with `custom_` → `{ kind: 'custom', id: productId, name, price, quantity }`; otherwise `{ kind: 'catalog', item }` where `item.product` is the current catalog product with the same id (joined `parentProduct` kept) but with `price` overridden by the order item's historical price, or — when the product no longer exists — a synthesized product `{ id, name, description: '', price, image, category: '', rating: 0, parentProductId: item.parentProductId }`; `quantity`, `selectedSize`, `selectedVariant` copied from the order item.
  - In `firestoreOrdersRepository.ts`: `adminUpdateOrder(orderId: string, p: { userName: string; phone: string; address: string; items: Record<string, any>[] | null; totalAmount: number; promoCode?: string; discount?: number }): Promise<void>` calling `supabase.rpc('admin_update_order', { p_order_id, p_user_name, p_phone, p_address, p_items, p_total_amount, p_promo_code: promoCode ?? null, p_discount: discount ?? null })` and throwing `new Error(error.message)`.

- [ ] **Step 1: Failing tests** (`orderEdit.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import type { Order, Product } from '@/shared/domain/types';
import { orderToDraftLines } from './orderEdit';

const product: Product = {
  id: 'p1', name: 'Tee', description: '', price: 999, image: 'tee.png', category: 'c', rating: 0, parentProductId: 'pp1',
  parentProduct: { id: 'pp1', name: 'pp', sizeOrder: ['M'], stockBySize: { M: 4 } },
};
const order: Order = {
  id: 'ord_x', userId: 'guest', userName: 'A', userEmail: '', address: 'x', phone: '017',
  items: [
    { productId: 'p1', name: 'Tee', price: 320, quantity: 2, image: 'tee.png', selectedSize: 'M', parentProductId: 'pp1' },
    { productId: 'gone', name: 'Old', price: 100, quantity: 1, image: 'o.png', selectedSize: 'L', parentProductId: 'pp9' },
    { productId: 'custom_abc', name: 'Gift wrap', price: 50, quantity: 3, image: '' },
  ],
  totalAmount: 0, status: 'pending', paymentMethod: 'cash_on_delivery', createdAt: '', updatedAt: '',
};

describe('orderToDraftLines', () => {
  const lines = orderToDraftLines(order, [product]);
  it('keeps the historical price but the live product (stock) for known catalog items', () => {
    expect(lines[0]).toMatchObject({ kind: 'catalog', item: { quantity: 2, selectedSize: 'M', product: { id: 'p1', price: 320 } } });
    expect((lines[0] as any).item.product.parentProduct.stockBySize.M).toBe(4);
  });
  it('synthesizes a product for items whose product no longer exists', () => {
    expect(lines[1]).toMatchObject({ kind: 'catalog', item: { selectedSize: 'L', product: { id: 'gone', price: 100, parentProductId: 'pp9' } } });
  });
  it('maps custom_ items to custom lines', () => {
    expect(lines[2]).toEqual({ kind: 'custom', id: 'custom_abc', name: 'Gift wrap', price: 50, quantity: 3 });
  });
});
```

Add to `adminOrder.test.ts` a test that `buildAdminOrderItemPayloads([catalog(2), custom(50,3)])` returns the same `items` as `buildAdminOrderItems(...).items` and does not throw for a catalog line without a parent (`product.parentProductId` undefined, no size). Run `npx vitest run src/features/admin` — Expected: FAIL.

- [ ] **Step 2: Implement** `orderToDraftLines`, the `buildAdminOrderItemPayloads` export (make `buildAdminOrderItems` use it), and `adminUpdateOrder`. Run the tests — Expected: PASS.

- [ ] **Step 3: Write the migration** `supabase/migrations/20261027000200_admin_update_order.sql`:

```sql
-- Admin-only: edit an order's customer details, items and pricing.
-- p_items NULL keeps the existing items. Items may only change while the
-- order is pending/confirmed; stock is adjusted by the net per-size delta.
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
```

Do NOT apply it. Do not run SQL against any database.

- [ ] **Step 4: Verify and commit**

Run: `npm run lint && npm test` — Expected: pass.

```bash
git add src/features supabase/migrations/20261027000200_admin_update_order.sql
git commit -m "feat(admin): order edit helpers, repository call and admin_update_order migration (unapplied)"
```

---

### Task 4: Edit Order page and Edit button

**Files:**
- Create: `src/features/admin/orders/presentation/EditOrderPage.tsx`, `src/app/admin/orders/edit/page.tsx`
- Modify: `src/features/admin/orders/presentation/AdminOrderCard.tsx` (Edit button)

**Interfaces:**
- Consumes: `orderToDraftLines`, `canEditItems`, `orderBreakdown`, `adminUpdateOrder`, `buildAdminOrderItemPayloads`, `ItemsCard`, `draftSubtotal`, `adminOrderTotal`, `validateDraft`, `useAdminData({ products: true })`, `applyCoupon`, `AdminPageHeader`, `AdminCard`, `Spinner`.

Requirements (read `CreateOrderPage.tsx` and `PricingCard.tsx` first and mirror their structure, error handling, coupon-staleness handling and double-submit guard):
- `src/app/admin/orders/edit/page.tsx`: `'use client'`, renders `<Suspense fallback={<Spinner />}><EditOrderPage /></Suspense>`. `EditOrderPage` reads `id` with `useSearchParams()`; shows a not-found message with a link back when missing/unknown.
- Load via `useAdminData({ products: true })`; find the order by id. Prefill: name, phone, address (textarea, 500 max), lines = `orderToDraftLines`, delivery fee = `orderBreakdown(order).deliveryFee` as an editable number input, discount = `orderBreakdown(order).discount`, coupon code = `order.promoCode`.
- If `canEditItems(order.status)` is false: render items read-only (list lines with no add/remove/qty controls and a notice "Items can't be changed once an order is out for delivery, delivered or cancelled") and send `items: null`. Otherwise render `ItemsCard` and send `buildAdminOrderItemPayloads(lines)`.
- Total = `adminOrderTotal({ subtotal, deliveryFee, discount })`. Coupon: same apply/clear behavior as CreateOrderPage (editing the discount manually clears the code; changing subtotal/fee clears an applied code with the re-apply message), except the initially loaded code is kept as-is until the admin edits something that invalidates it.
- Submit: validate with `validateDraft` (name, phone, address, lines), call `adminUpdateOrder(order.id, { userName, phone, address, items, totalAmount: total, promoCode, discount })`, then `router.push('/admin/orders')`. Show RPC errors (e.g. "Only 2 left in size M…") verbatim inline; keep the form state; reset the submitting guard on error.
- Header: `AdminPageHeader title="Edit Order" subtitle={shortOrderId(order.id) + ' · ' + status label}`.
- `AdminOrderCard`: add an **Edit** button (`Pencil` icon, `Link` to `/admin/orders/edit?id=${order.id}`, id `admin-order-edit-<id>`), rounded-md, in the collapsed row between the total and the chevron.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npm run lint && npm test && npx next build` — build must list `/admin/orders/edit`. State what could not be verified in a browser.
- [ ] **Step 3: Commit**

```bash
git add src/features/admin/orders src/app/admin/orders/edit
git commit -m "feat(admin): edit order page with item, pricing and customer editing"
```

---

## Self-Review

- **Spec coverage:** compact cards, status tag + pencil dropdown, derived breakdown with coupon code (Tasks 1–2); Edit button + edit page with items/pricing/customer, read-only items for locked statuses (Tasks 3–4); `admin_update_order` with stock delta, coupon usage adjustment, admin check (Task 3); backup + go-ahead before applying (Global Constraints, controller step).
- **Placeholders:** none; UI tasks are specified by props, behavior and reference files.
- **Type consistency:** `orderBreakdown`, `canEditItems`, `shortOrderId`, `orderToDraftLines`, `buildAdminOrderItemPayloads`, `adminUpdateOrder` names/signatures match across tasks.
- **Risks to check in review:** `p_items` null vs locked status; SQL delta for items lacking `selectedSize`; coupon usage change only when the code actually changes; Suspense around `useSearchParams` (static export build).
