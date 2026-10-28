# Admin Create Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin create an order (catalog + free-form items) from `/admin/orders/new`.

**Architecture:** Pure helpers in `src/features/admin/createOrder/domain/` (tested) feed a thin application function that calls the existing `createOrder` (`place_order` RPC) and `updateOrderStatusAsAdmin`. The page reuses checkout's `DeliveryInfoCard`, `computeDeliveryFeeByZone`, `computeTotal`, `buildStockLines`, `applyCoupon`.

**Tech Stack:** Next.js 15, React 19, Tailwind 4, lucide-react, Supabase JS, vitest.

## Global Constraints

- Storefront `Navbar` is NOT modified. No new npm dependencies. No schema/migration changes.
- Free-form items use `productId` = `custom_<random>`, `image_url: ''`, and are NOT included in `cartLines` (no stock reservation).
- Admin-created orders are saved with `userId: 'guest'`, `userEmail: ''`.
- Address string format is exactly CheckoutForm's: `[street.trim(), thana, cityCorp (Dhaka district only), district, division, 'Bangladesh'].filter(Boolean).join(', ')`, max 500 chars.
- Currency via `formatCurrency` (`@/shared/lib/formatCurrency`).
- The page renders inside the admin shell: it must not render Navbar or RequireAdmin.
- Each task ends green on `npm run lint` and `npm test` and is its own commit; messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## File Structure

- Create `src/features/checkout/domain/orderItemPayload.ts` (+ test): shared `buildOrderItemPayload(item: CartItem)` extracted from `placeOrder.ts`.
- Modify `src/features/checkout/application/placeOrder.ts`: use the shared function (behavior unchanged).
- Create `src/features/admin/createOrder/domain/adminOrder.ts` (+ test): draft types, totals, validation, address formatting, payload builder.
- Create `src/features/admin/createOrder/application/createAdminOrder.ts`.
- Create `src/features/admin/createOrder/presentation/{CatalogItemPicker,CustomItemForm,ItemsCard,PricingCard,CreateOrderPage}.tsx`.
- Create `src/app/admin/orders/new/page.tsx`; modify `AdminOrderManager.tsx` (header button) and `QuickActions.tsx` (dashboard).

---

### Task 1: Pure helpers + shared order-item payload (TDD)

**Files:**
- Create: `src/features/checkout/domain/orderItemPayload.ts`, `orderItemPayload.test.ts`
- Modify: `src/features/checkout/application/placeOrder.ts`
- Create: `src/features/admin/createOrder/domain/adminOrder.ts`, `adminOrder.test.ts`

**Interfaces:**
- Produces:
  - `buildOrderItemPayload(item: CartItem): Record<string, any>` — exactly the object `placeOrder` builds today per cart item (`productId`, `name`, `price`, `quantity`, `image_url`, optional `selectedSize`, `selectedVariant {id,name,colorCode|null,image_url|null}`, `parentProductId`).
  - In `adminOrder.ts`:
    - `type DraftLine = { kind: 'catalog'; item: CartItem } | { kind: 'custom'; id: string; name: string; price: number; quantity: number }`
    - `lineSubtotal(line: DraftLine): number`, `draftSubtotal(lines: DraftLine[]): number`
    - `newCustomItemId(): string` (`custom_` + 12 random hex chars)
    - `adminOrderTotal(params: { subtotal: number; deliveryFee: number; discount: number }): number` — discount clamped to `[0, subtotal + deliveryFee]`, result via `computeTotal`
    - `formatAdminAddress(p: { street: string; thana: string; cityCorp: string; district: string; division: string }): string`
    - `buildAdminOrderItems(lines: DraftLine[]): { items: Record<string, any>[]; cartLines: StockLine[] }`
    - `validateDraft(d: { name: string; phone: string; address: string; lines: DraftLine[] }): string | null` — first error message or null

- [ ] **Step 1: Write failing tests**

```ts
// src/features/checkout/domain/orderItemPayload.test.ts
import { describe, it, expect } from 'vitest';
import type { CartItem } from '@/shared/domain/types';
import { buildOrderItemPayload } from './orderItemPayload';

const product = { id: 'p1', name: 'Tee', description: '', price: 500, image: 'tee.png', category: 'c', rating: 0, parentProductId: 'pp1' };

describe('buildOrderItemPayload', () => {
  it('maps a plain cart item', () => {
    const item: CartItem = { product, quantity: 2 };
    expect(buildOrderItemPayload(item)).toEqual({
      productId: 'p1', name: 'Tee', price: 500, quantity: 2, image_url: 'tee.png', parentProductId: 'pp1',
    });
  });
  it('includes size and variant when selected', () => {
    const item: CartItem = { product, quantity: 1, selectedSize: 'M', selectedVariant: { id: 'v1', name: 'Black', colorCode: '#000' } };
    expect(buildOrderItemPayload(item)).toMatchObject({
      selectedSize: 'M',
      selectedVariant: { id: 'v1', name: 'Black', colorCode: '#000', image_url: null },
    });
  });
});
```

```ts
// src/features/admin/createOrder/domain/adminOrder.test.ts
import { describe, it, expect } from 'vitest';
import type { CartItem } from '@/shared/domain/types';
import {
  lineSubtotal, draftSubtotal, newCustomItemId, adminOrderTotal, formatAdminAddress,
  buildAdminOrderItems, validateDraft, type DraftLine,
} from './adminOrder';

const product = { id: 'p1', name: 'Tee', description: '', price: 500, image: 'tee.png', category: 'c', rating: 0, parentProductId: 'pp1' };
const catalog = (qty: number, size = 'M'): DraftLine => ({ kind: 'catalog', item: { product, quantity: qty, selectedSize: size } as CartItem });
const custom = (price: number, quantity: number): DraftLine => ({ kind: 'custom', id: 'custom_abc', name: 'Gift wrap', price, quantity });

describe('subtotals', () => {
  it('multiplies price by quantity per line and sums', () => {
    expect(lineSubtotal(catalog(2))).toBe(1000);
    expect(lineSubtotal(custom(50, 3))).toBe(150);
    expect(draftSubtotal([catalog(1), custom(50, 3)])).toBe(650);
  });
});

describe('newCustomItemId', () => {
  it('has the custom_ prefix and is unique', () => {
    const a = newCustomItemId();
    expect(a).toMatch(/^custom_[0-9a-f]{12}$/);
    expect(newCustomItemId()).not.toBe(a);
  });
});

describe('adminOrderTotal', () => {
  it('adds fee and subtracts discount', () => {
    expect(adminOrderTotal({ subtotal: 1000, deliveryFee: 70, discount: 100 })).toBe(970);
  });
  it('clamps discount to subtotal + fee and to zero', () => {
    expect(adminOrderTotal({ subtotal: 100, deliveryFee: 50, discount: 9999 })).toBe(0);
    expect(adminOrderTotal({ subtotal: 100, deliveryFee: 50, discount: -20 })).toBe(150);
  });
});

describe('formatAdminAddress', () => {
  it('matches the checkout format and skips empty parts', () => {
    expect(formatAdminAddress({ street: ' 12 Road ', thana: 'Savar', cityCorp: '', district: 'Dhaka', division: 'Dhaka' }))
      .toBe('12 Road, Savar, Dhaka, Dhaka, Bangladesh');
  });
});

describe('buildAdminOrderItems', () => {
  it('builds items for both kinds but reserves stock for catalog lines only', () => {
    const { items, cartLines } = buildAdminOrderItems([catalog(2), custom(50, 3)]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ productId: 'p1', quantity: 2, selectedSize: 'M' });
    expect(items[1]).toEqual({ productId: 'custom_abc', name: 'Gift wrap', price: 50, quantity: 3, image_url: '' });
    expect(cartLines).toEqual([{ parent_id: 'pp1', size: 'M', qty: 2 }]);
  });
  it('returns no cart lines when every line is custom', () => {
    expect(buildAdminOrderItems([custom(10, 1)]).cartLines).toEqual([]);
  });
});

describe('validateDraft', () => {
  const ok = { name: 'Rahim', phone: '01711111111', address: 'x', lines: [custom(10, 1)] };
  it('accepts a valid draft', () => expect(validateDraft(ok)).toBeNull());
  it('requires name, phone, address and at least one line', () => {
    expect(validateDraft({ ...ok, name: ' ' })).toBe('Customer name is required.');
    expect(validateDraft({ ...ok, phone: '' })).toBe('Phone number is required.');
    expect(validateDraft({ ...ok, address: '' })).toBe('Delivery address is required.');
    expect(validateDraft({ ...ok, lines: [] })).toBe('Add at least one item.');
  });
  it('rejects address over 500 chars and bad custom lines', () => {
    expect(validateDraft({ ...ok, address: 'a'.repeat(501) })).toBe('Address is too long. Maximum length is 500 characters.');
    expect(validateDraft({ ...ok, lines: [{ kind: 'custom', id: 'c', name: ' ', price: 10, quantity: 1 }] })).toBe('Every custom item needs a name.');
    expect(validateDraft({ ...ok, lines: [custom(-1, 1)] })).toBe('Custom item prices cannot be negative.');
    expect(validateDraft({ ...ok, lines: [custom(10, 0)] })).toBe('Quantities must be at least 1.');
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/features/checkout/domain/orderItemPayload src/features/admin/createOrder`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

```ts
// src/features/checkout/domain/orderItemPayload.ts
import type { CartItem } from '@/shared/domain/types';

// The per-line JSON stored in orders.items (and read back by toOrderItem in
// the orders repository). Shared by storefront checkout and admin order entry.
export function buildOrderItemPayload(item: CartItem): Record<string, any> {
  const orderItem: Record<string, any> = {
    productId: item.product.id,
    name: item.product.name,
    price: item.product.price,
    quantity: item.quantity,
    image_url: item.product.image,
  };
  if (item.selectedSize) orderItem.selectedSize = item.selectedSize;
  if (item.selectedVariant) {
    orderItem.selectedVariant = {
      id: item.selectedVariant.id,
      name: item.selectedVariant.name,
      colorCode: item.selectedVariant.colorCode ?? null,
      image_url: item.selectedVariant.image ?? null,
    };
  }
  if (item.product.parentProductId) orderItem.parentProductId = item.product.parentProductId;
  return orderItem;
}
```

In `placeOrder.ts` replace the inline `cartItems.map((item) => { ... })` block with `const orderItemsPayload = cartItems.map(buildOrderItemPayload);` and add `import { buildOrderItemPayload } from '../domain/orderItemPayload';`.

```ts
// src/features/admin/createOrder/domain/adminOrder.ts
import type { CartItem } from '@/shared/domain/types';
import { computeTotal } from '@/features/checkout/domain/pricing';
import { buildOrderItemPayload } from '@/features/checkout/domain/orderItemPayload';
import { buildStockLines, type StockLine } from '@/features/checkout/infrastructure/reserveParentStock';

export type DraftLine =
  | { kind: 'catalog'; item: CartItem }
  | { kind: 'custom'; id: string; name: string; price: number; quantity: number };

export function lineSubtotal(line: DraftLine): number {
  return line.kind === 'catalog' ? line.item.product.price * line.item.quantity : line.price * line.quantity;
}

export function draftSubtotal(lines: DraftLine[]): number {
  return lines.reduce((sum, l) => sum + lineSubtotal(l), 0);
}

export function newCustomItemId(): string {
  const hex = Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `custom_${hex}`;
}

export function adminOrderTotal(params: { subtotal: number; deliveryFee: number; discount: number }): number {
  const { subtotal, deliveryFee } = params;
  const discount = Math.min(Math.max(params.discount, 0), subtotal + deliveryFee);
  return computeTotal(subtotal, deliveryFee, discount);
}

export function formatAdminAddress(p: { street: string; thana: string; cityCorp: string; district: string; division: string }): string {
  return [p.street.trim(), p.thana, p.cityCorp, p.district, p.division, 'Bangladesh'].filter(Boolean).join(', ');
}

export function buildAdminOrderItems(lines: DraftLine[]): { items: Record<string, any>[]; cartLines: StockLine[] } {
  const items = lines.map((l) =>
    l.kind === 'catalog'
      ? buildOrderItemPayload(l.item)
      : { productId: l.id, name: l.name.trim(), price: l.price, quantity: l.quantity, image_url: '' },
  );
  const catalogItems = lines.flatMap((l) => (l.kind === 'catalog' ? [l.item] : []));
  return { items, cartLines: buildStockLines(catalogItems) };
}

export function validateDraft(d: { name: string; phone: string; address: string; lines: DraftLine[] }): string | null {
  if (!d.name.trim()) return 'Customer name is required.';
  if (!d.phone.trim()) return 'Phone number is required.';
  if (!d.address.trim()) return 'Delivery address is required.';
  if (d.address.length > 500) return 'Address is too long. Maximum length is 500 characters.';
  if (d.lines.length === 0) return 'Add at least one item.';
  for (const l of d.lines) {
    if (l.kind === 'custom') {
      if (!l.name.trim()) return 'Every custom item needs a name.';
      if (l.price < 0 || Number.isNaN(l.price)) return 'Custom item prices cannot be negative.';
    }
    const qty = l.kind === 'catalog' ? l.item.quantity : l.quantity;
    if (!Number.isInteger(qty) || qty < 1) return 'Quantities must be at least 1.';
  }
  return null;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/checkout src/features/admin/createOrder && npm run lint && npm test`
Expected: all PASS; tsc exit 0 (placeOrder still compiles and its behavior is unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/features/checkout src/features/admin/createOrder
git commit -m "feat(admin): order draft helpers and shared order-item payload"
```

---

### Task 2: Application function, page, routes and entry points

**Files:**
- Create: `src/features/admin/createOrder/application/createAdminOrder.ts`
- Create: `src/features/admin/createOrder/presentation/{CatalogItemPicker,CustomItemForm,ItemsCard,PricingCard,CreateOrderPage}.tsx`
- Create: `src/app/admin/orders/new/page.tsx`
- Modify: `src/features/admin/orders/presentation/AdminOrderManager.tsx` (header action), `src/features/admin/dashboard/presentation/QuickActions.tsx`

**Interfaces:**
- Consumes (Task 1): `DraftLine`, `draftSubtotal`, `lineSubtotal`, `newCustomItemId`, `adminOrderTotal`, `formatAdminAddress`, `buildAdminOrderItems`, `validateDraft`. Existing: `createOrder` + `CreateOrderPayload` (`@/features/orders/infrastructure/firestoreOrdersRepository`), `updateOrderStatusAsAdmin` (`@/features/admin/orders/application/updateOrderStatusAsAdmin`), `generateOrderId`, `computeDeliveryFeeByZone` (`@/features/checkout/domain/pricing`), `DeliveryInfoCard` + `DeliveryInfoValues` (`@/features/checkout/presentation/DeliveryInfoCard`), `divisions, districts, thanas, cityCorporations` (`@/features/checkout/infrastructure/bangladeshAreas`), `applyCoupon` (`@/features/coupons/application/applyCoupon`), `useAdminData({ products: true })` (products have `parentProduct` joined), `AdminPageHeader`, `AdminCard`, `STATUS_LABELS`/`STATUS_ORDER` (analytics domain).
- Produces: `createAdminOrder(params): Promise<string>` returning the new order id.

- [ ] **Step 1: Application function**

```ts
// src/features/admin/createOrder/application/createAdminOrder.ts
import type { OrderStatus } from '@/shared/domain/types';
import { createOrder } from '@/features/orders/infrastructure/firestoreOrdersRepository';
import { generateOrderId } from '@/features/checkout/domain/pricing';
import { updateOrderStatusAsAdmin } from '@/features/admin/orders/application/updateOrderStatusAsAdmin';
import { buildAdminOrderItems, type DraftLine } from '../domain/adminOrder';

export async function createAdminOrder(params: {
  name: string;
  phone: string;
  address: string;
  lines: DraftLine[];
  total: number;
  promoCode?: string;
  discount?: number;
  status: OrderStatus;
}): Promise<string> {
  const orderId = generateOrderId();
  const { items, cartLines } = buildAdminOrderItems(params.lines);
  await createOrder(orderId, {
    userId: 'guest',
    userName: params.name.trim(),
    userEmail: '',
    address: params.address,
    phone: params.phone.trim(),
    items,
    totalAmount: params.total,
    promoCode: params.promoCode,
    discount: params.discount && params.discount > 0 ? params.discount : undefined,
    cartLines,
  });
  if (params.status !== 'pending') {
    await updateOrderStatusAsAdmin(orderId, params.status);
  }
  return orderId;
}
```

If the status update fails after the order was created, the order exists as Pending: throw an Error whose message says "Order #<last8> was created but setting its status failed — change it from All Orders." Wrap only the status call in try/catch for this.

- [ ] **Step 2: Presentation components** (each `'use client'`, Tailwind classes matching `AdminCard` styling)

- `CatalogItemPicker.tsx` — props `{ products: Product[]; onAdd: (item: CartItem) => void }`. Search input filters `products` by name (case-insensitive, show first 8 matches). Selecting a product shows: size `<select>` from `product.parentProduct?.sizeOrder` (option label `"M (4 left)"` from `stockBySize`, disabled when 0 stock), variant `<select>` when `product.variants?.length`, quantity number input (min 1, max = chosen size's stock). "Add item" button calls `onAdd({ product, quantity, selectedSize, selectedVariant })` and resets. A product without `parentProduct` cannot be added (show "No stock record — use a custom item"). Quantity clamping uses the stock for the chosen size.
- `CustomItemForm.tsx` — props `{ onAdd: (line: Extract<DraftLine, { kind: 'custom' }>) => void }`. Inputs: name, unit price (number, min 0), quantity (min 1). "Add custom item" calls `onAdd({ kind: 'custom', id: newCustomItemId(), name, price, quantity })` and resets; disabled until name is non-empty.
- `ItemsCard.tsx` — props `{ products: Product[]; lines: DraftLine[]; onChange: (lines: DraftLine[]) => void }`. Renders a tab toggle ("Catalog product" / "Custom item") that shows `CatalogItemPicker` or `CustomItemForm`; below, the list of lines (name, size/variant, qty ± buttons, line subtotal via `formatCurrency(lineSubtotal(l))`, remove button). Catalog `onAdd` merges with an existing line of the same product+size+variant by summing quantity, else appends `{ kind: 'catalog', item }`.
- `PricingCard.tsx` — props `{ subtotal: number; districtId: string; deliveryFee: number; feeOverride: string; onFeeOverrideChange: (v: string) => void; discount: string; onDiscountChange: (v: string) => void; promoCode: string | undefined; onApplyCoupon: (code: string) => Promise<void>; couponMessage: string | null }`. Shows auto fee ("Auto: ৳70" hint) with an override input (empty = auto), a discount amount input, and a coupon code input + "Apply" button that calls `onApplyCoupon`.
- `CreateOrderPage.tsx` — default export. State: `DeliveryInfoValues` (name, phone, divisionId, districtId, thanaId, cityCorpId, streetAddress; update via `patch`), `lines`, `feeOverride`, `discount`, `appliedCode`, `couponMessage`, `status` (`OrderStatus`, default `'pending'`), `error`, `submitting`. `useAdminData({ products: true })` for products (loading → `Spinner`; error → red box with Retry like `CustomersPage`). Derived: `autoFee = computeDeliveryFeeByZone({ districtId, cityCorpId, thanaId })`, `deliveryFee = feeOverride.trim() !== '' ? Number(feeOverride) : autoFee` (reject NaN/negative via `error`), `subtotal = draftSubtotal(lines)`, `discountNum = Number(discount) || 0`, `total = adminOrderTotal({ subtotal, deliveryFee, discount: discountNum })`. Apply coupon: `applyCoupon({ code, user: null, subtotal, deliveryFee, districtId })`; on `valid` set `discount` to `String(result.discountAmount)` and `appliedCode` to `result.coupon.code`, on invalid set `couponMessage = result.reason`. Submit: require `thanaId`, and `cityCorpId` when `districtId === 'dhaka_dist'` (same messages as `CheckoutForm`), compute `address = formatAdminAddress({...})` using names looked up from `divisions/districts/thanas/cityCorporations` (city corp only for the Dhaka district), run `validateDraft`, then `createAdminOrder({... promoCode: appliedCode, discount: discountNum, total, status })`; on success `router.push('/admin/orders')`; on error show `error` (stock errors from the RPC are shown verbatim) and keep the form. Layout: `AdminPageHeader title="Create Order" subtitle="Enter an order taken by phone or message."`, two columns on `xl` (left: `DeliveryInfoCard`, `ItemsCard`, status `<select>` using `STATUS_ORDER`/`STATUS_LABELS`; right sticky: `PricingCard` + summary card with subtotal, delivery, discount, total and the submit button "Create Order"). Disable submit while `submitting`.

- [ ] **Step 3: Route and entry points**

`src/app/admin/orders/new/page.tsx`:

```tsx
'use client';

import CreateOrderPage from '@/features/admin/createOrder/presentation/CreateOrderPage';

export default function AdminCreateOrderPage() {
  return <CreateOrderPage />;
}
```

`AdminOrderManager.tsx`: add to its `AdminPageHeader` `actions` a `<Link href="/admin/orders/new" id="admin-create-order-btn">` styled like the other primary header buttons (black bg, white text, `Plus` icon, label "Create Order"); keep existing actions. `QuickActions.tsx`: add `{ label: 'Create Order', href: '/admin/orders/new', icon: ClipboardList }` replacing no existing entry (grid becomes 7 items; change the grid to `grid-cols-2 sm:grid-cols-3`).

- [ ] **Step 4: Verify**

Run: `npm run lint && npm test && npx next build`
Expected: tsc clean, all tests pass, build lists `/admin/orders/new`. Admin sign-in is Google OAuth so the form cannot be exercised in a browser by the agent; state this in the report.

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/createOrder src/app/admin/orders/new src/features/admin/orders src/features/admin/dashboard
git commit -m "feat(admin): create custom order from the admin panel"
```

---

## Self-Review

- **Spec coverage:** entry points (Task 2 Step 3), customer card reuse + address format (Task 1 `formatAdminAddress`, Task 2 page), catalog + custom items with stock cap (Task 2 components, `buildAdminOrderItems` excludes custom from cartLines), auto fee + override + discount + coupon (Task 2 PricingCard/page, `adminOrderTotal`), initial status (Task 2 `createAdminOrder`), guest user id (Global Constraints, `createAdminOrder`), no schema change.
- **Placeholders:** none; the presentation components are specified by props and behavior because they are UI composition over tested helpers.
- **Type consistency:** `DraftLine`, `StockLine`, `buildAdminOrderItems`, `createAdminOrder` signatures match across both tasks.
- **Risk to verify during review:** `buildStockLines` throws for a catalog item without `parentProductId` or size — the page must surface that message as `error` (it is thrown inside `createAdminOrder` before the RPC call, so nothing is created).
