# Zone-Based Delivery Pricing + Taka Currency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `$4.99`/`free-over-$100` delivery fee with zone-based Taka pricing (70/110/130 based on delivery area), and switch the currency symbol from `$` to `৳` everywhere.

**Architecture:** New pure zone-matching logic in `checkout/domain/pricing.ts` replaces the old threshold logic; `CheckoutForm` and `placeOrder` both compute the fee from the same three geography fields. `formatCurrency` (existing, currently unused by any UI) becomes the single formatting path, switched to `৳`, and every inline `` `$${x.toFixed(2)}` `` across the app is routed through it.

**Tech Stack:** Same as the rest of the app.

## Global Constraints

- Zone matching uses the district/city-corporation/thana ids already used by `bangladeshAreas.ts` and the checkout form — no new geography concepts beyond two added thana entries.
- No subtotal-based free delivery anymore — the zone fee always applies (the `FREESHIP` coupon still works, since it waives whatever `computeDeliveryFeeByZone` returns).
- `formatCurrency` takes a `number`, returns a `string` including the `৳` symbol — never concatenate `৳` manually at call sites.
- All new/modified TypeScript files must pass `npx tsc --noEmit`.
- Don't run `next build` while `next dev` is running (established this session) — stop the dev server first, build, then restart it.

---

## Task 1: Add missing thana entries

**Files:**
- Modify: `src/features/checkout/infrastructure/bangladeshAreas.ts`

**Interfaces:** none new — just two additional `Thana` entries.

- [ ] **Step 1: Add "Ashulia" under Dhaka district**

In the `thanas` array, in the "Dhaka District" section (near the existing `savar` and `keraniganj` entries), add:

```ts
  { id: 'ashulia', name: 'Ashulia', districtId: 'dhaka_dist' },
```

- [ ] **Step 2: Add "Tongi" under Gazipur district**

In the `thanas` array, in the "Gazipur District" section (near `gazipur_sadar`), add:

```ts
  { id: 'tongi', name: 'Tongi', districtId: 'gazipur' },
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/checkout/infrastructure/bangladeshAreas.ts
git commit -m "feat: add Ashulia and Tongi thana entries for delivery zone coverage"
```

---

## Task 2: Zone-based delivery fee domain logic

**Files:**
- Modify: `src/features/checkout/domain/pricing.ts`
- Modify: `src/features/checkout/domain/pricing.test.ts`

**Interfaces:**
- Removes: `FREE_DELIVERY_THRESHOLD`, `DELIVERY_FEE`, `computeDeliveryFee(subtotal)`.
- Produces: `CITY_CORPORATION_DELIVERY_FEE` (70), `DHAKA_SUBURBAN_DELIVERY_FEE` (110), `STANDARD_DELIVERY_FEE` (130), `computeDeliveryFeeByZone(params: { districtId?: string; cityCorpId?: string; thanaId?: string }): number`.
- `computeTotal` and `generateOrderId` are unchanged.

- [ ] **Step 1: Write the failing tests**

Replace `src/features/checkout/domain/pricing.test.ts` entirely:

```ts
import { describe, it, expect } from 'vitest';
import { computeDeliveryFeeByZone, computeTotal, generateOrderId } from './pricing';

describe('computeDeliveryFeeByZone', () => {
  it('charges 70 for Dhaka city corporation (DNCC)', () => {
    expect(computeDeliveryFeeByZone({ districtId: 'dhaka_dist', cityCorpId: 'dncc' })).toBe(70);
  });

  it('charges 70 for Dhaka city corporation (DSCC)', () => {
    expect(computeDeliveryFeeByZone({ districtId: 'dhaka_dist', cityCorpId: 'dscc' })).toBe(70);
  });

  it('charges 110 for a Dhaka-suburban thana even without a city corporation', () => {
    expect(computeDeliveryFeeByZone({ districtId: 'dhaka_dist', cityCorpId: 'outside_cc', thanaId: 'savar' })).toBe(110);
  });

  it('charges 110 for Gazipur Sadar (a different district than dhaka_dist)', () => {
    expect(computeDeliveryFeeByZone({ districtId: 'gazipur', thanaId: 'gazipur_sadar' })).toBe(110);
  });

  it('charges 110 for the newly added Ashulia and Tongi thanas', () => {
    expect(computeDeliveryFeeByZone({ districtId: 'dhaka_dist', thanaId: 'ashulia' })).toBe(110);
    expect(computeDeliveryFeeByZone({ districtId: 'gazipur', thanaId: 'tongi' })).toBe(110);
  });

  it('charges 130 for a Dhaka-district thana inside DCC but with no city corporation selected', () => {
    expect(computeDeliveryFeeByZone({ districtId: 'dhaka_dist', thanaId: 'mirpur' })).toBe(130);
  });

  it('charges 130 for an unrelated district', () => {
    expect(computeDeliveryFeeByZone({ districtId: 'chattogram_dist', thanaId: 'kotwali' })).toBe(130);
  });

  it('charges 130 when nothing is selected yet', () => {
    expect(computeDeliveryFeeByZone({})).toBe(130);
  });
});

describe('computeTotal', () => {
  it('computes total as subtotal + delivery - discount, rounded to cents', () => {
    expect(computeTotal(100, 70, 0)).toBe(170);
    expect(computeTotal(50, 110, 10)).toBe(150);
  });
});

describe('generateOrderId', () => {
  it('generates an order id starting with ord_ and 12 hex chars', () => {
    expect(generateOrderId()).toMatch(/^ord_[0-9a-f]{12}$/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- pricing.test`
Expected: FAIL (old exports don't match).

- [ ] **Step 3: Implement the new domain module**

Replace `src/features/checkout/domain/pricing.ts` entirely:

```ts
export const CITY_CORPORATION_DELIVERY_FEE = 70;
export const DHAKA_SUBURBAN_DELIVERY_FEE = 110;
export const STANDARD_DELIVERY_FEE = 130;

const DHAKA_CITY_CORPORATION_IDS = ['dncc', 'dscc'];

// Savar, Ashulia, Keraniganj, Tongi, Narayanganj Sadar, Dhamrai, Nawabganj, Dohar,
// Gazipur Sadar — the "Dhaka Sub" delivery zone. Every other named place in that
// zone description (EPZ, Jahangirnagar University, Siddhirganj, etc.) is a
// sub-locality of one of these thanas, not a separate selectable area.
const DHAKA_SUBURBAN_THANA_IDS = [
  'savar',
  'ashulia',
  'keraniganj',
  'tongi',
  'narayanganj_sadar',
  'dhamrai',
  'nawabganj',
  'dohar',
  'gazipur_sadar',
];

export function computeDeliveryFeeByZone(params: {
  districtId?: string;
  cityCorpId?: string;
  thanaId?: string;
}): number {
  const { districtId, cityCorpId, thanaId } = params;
  if (districtId === 'dhaka_dist' && cityCorpId && DHAKA_CITY_CORPORATION_IDS.includes(cityCorpId)) {
    return CITY_CORPORATION_DELIVERY_FEE;
  }
  if (thanaId && DHAKA_SUBURBAN_THANA_IDS.includes(thanaId)) {
    return DHAKA_SUBURBAN_DELIVERY_FEE;
  }
  return STANDARD_DELIVERY_FEE;
}

export function computeTotal(subtotal: number, deliveryFee: number, discount = 0): number {
  return Math.round((subtotal + deliveryFee - discount) * 100) / 100;
}

export function generateOrderId(): string {
  const randomHex = Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `ord_${randomHex}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- pricing.test`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/checkout/domain
git commit -m "feat: replace flat delivery fee with zone-based Taka pricing (70/110/130)"
```

---

## Task 3: Wire checkout to zone-based pricing

**Files:**
- Modify: `src/features/checkout/application/placeOrder.ts`
- Modify: `src/features/checkout/presentation/CheckoutForm.tsx`

**Interfaces:**
- `DeliveryDetails` gains `districtId?: string`, `cityCorpId?: string`, `thanaId?: string`.
- Consumes: `computeDeliveryFeeByZone` (Task 2).

- [ ] **Step 1: Update `placeOrder`**

In `src/features/checkout/application/placeOrder.ts`:

1. Change the import:
   ```ts
   import { computeDeliveryFeeByZone, computeTotal, generateOrderId } from '../domain/pricing';
   ```
2. Add the three fields to `DeliveryDetails`:
   ```ts
   export interface DeliveryDetails {
     name: string;
     phone: string;
     address: string;
     districtId?: string;
     cityCorpId?: string;
     thanaId?: string;
     promoCode?: string;
     discount?: number;
     finalTotal?: number;
   }
   ```
3. Replace:
   ```ts
   const deliveryFee = computeDeliveryFee(subtotal);
   ```
   with:
   ```ts
   const deliveryFee = computeDeliveryFeeByZone({
     districtId: deliveryDetails.districtId,
     cityCorpId: deliveryDetails.cityCorpId,
     thanaId: deliveryDetails.thanaId,
   });
   ```

- [ ] **Step 2: Update `CheckoutForm`**

In `src/features/checkout/presentation/CheckoutForm.tsx`:

1. Change the import:
   ```ts
   import { computeDeliveryFeeByZone, computeTotal } from '../domain/pricing';
   ```
2. Replace:
   ```ts
   const deliveryFee = computeDeliveryFee(subtotal);
   ```
   with:
   ```ts
   const deliveryFee = computeDeliveryFeeByZone({ districtId, cityCorpId, thanaId });
   ```
3. In the `onPlaceOrder` call inside `handleSubmit`, add the three fields to the object passed in:
   ```ts
   await onPlaceOrder({
     name: name.trim(),
     phone: phone.trim(),
     address: formattedAddress,
     districtId,
     cityCorpId: cityCorpId || undefined,
     thanaId,
     promoCode: appliedCoupon?.code,
     discount: discountAmount > 0 ? discountAmount : undefined,
     finalTotal: grandTotal,
   });
   ```
4. Simplify the "Shipping Fee" display row — the fee is never 0 anymore, so drop the `FREE` branch:
   ```tsx
   <span className="font-bold text-black">{formatCurrency(deliveryFee)}</span>
   ```
   (This line's `formatCurrency` import is added in Task 4 — leave this exact edit for that task if doing them in order, or apply now if Task 4 is done first; either order works since both touch this file.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/checkout
git commit -m "feat: wire checkout to zone-based delivery pricing"
```

---

## Task 4: Switch currency to Taka and centralize formatting

**Files:**
- Modify: `src/shared/lib/formatCurrency.ts`
- Modify: `src/shared/lib/formatCurrency.test.ts`
- Modify: `src/features/catalog/presentation/ProductCard.tsx`
- Modify: `src/features/product/presentation/ProductDetailView.tsx`
- Modify: `src/features/cart/presentation/CartDrawer.tsx`
- Modify: `src/features/checkout/presentation/CheckoutForm.tsx`
- Modify: `src/features/orders/presentation/OrderTrackingView.tsx`
- Modify: `src/features/admin/orders/presentation/AdminOrderManager.tsx`
- Modify: `src/features/admin/inventory/presentation/InventoryManager.tsx`
- Modify: `src/features/admin/coupons/presentation/CouponManager.tsx`
- Modify: `src/features/coupons/domain/coupon.ts`

**Interfaces:** `formatCurrency(amount: number): string` now returns `` `৳${amount.toFixed(2)}` `` — signature unchanged, every call site unchanged except literal `` `$${x.toFixed(2)}` `` → `` `${formatCurrency(x)}` `` or `{formatCurrency(x)}` in JSX.

- [ ] **Step 1: Update `formatCurrency` and its test**

`src/shared/lib/formatCurrency.ts`:

```ts
export function formatCurrency(amount: number): string {
  return `৳${amount.toFixed(2)}`;
}
```

`src/shared/lib/formatCurrency.test.ts` — update the expected strings:

```ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatCurrency';

describe('formatCurrency', () => {
  it('formats a whole number with two decimals', () => {
    expect(formatCurrency(100)).toBe('৳100.00');
  });

  it('formats a fractional number with two decimals', () => {
    expect(formatCurrency(4.9)).toBe('৳4.90');
  });

  it('rounds to two decimals', () => {
    expect(formatCurrency(4.999)).toBe('৳5.00');
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm run test -- formatCurrency`
Expected: PASS, 3 tests.

- [ ] **Step 3: `ProductCard.tsx`**

Add `import { formatCurrency } from '@/shared/lib/formatCurrency';`. Replace:
```tsx
<span className="text-[15px] font-bold text-black leading-tight">${product.price.toFixed(2)}</span>
```
with:
```tsx
<span className="text-[15px] font-bold text-black leading-tight">{formatCurrency(product.price)}</span>
```
And:
```tsx
${product.originalPrice?.toFixed(2)}
```
with:
```tsx
{product.originalPrice !== undefined && formatCurrency(product.originalPrice)}
```

- [ ] **Step 4: `ProductDetailView.tsx`**

Add the import. Replace:
```tsx
<span className="text-2xl font-bold text-black">${product.price.toFixed(2)}</span>
```
with `{formatCurrency(product.price)}` in place of `${product.price.toFixed(2)}`.

Replace:
```tsx
${product.originalPrice.toFixed(2)}
```
with `{formatCurrency(product.originalPrice)}`.

Replace the add-to-cart button's trailing total:
```tsx
{selectedVariant || selectedSize ? ')' : ''} - ${(product.price * quantity).toFixed(2)}
```
with:
```tsx
{selectedVariant || selectedSize ? ')' : ''} - {formatCurrency(product.price * quantity)}
```
(This sits inside a `<span>{...}</span>` with several template-string children — convert the whole span's content to JSX expression children rather than one big template literal, e.g. `{selectedVariant ? selectedVariant.name : ''}{selectedVariant && selectedSize ? ' - ' : ''}{selectedSize ? selectedSize : ''}{selectedVariant || selectedSize ? ')' : ''} - {formatCurrency(product.price * quantity)}`.)

- [ ] **Step 5: `CartDrawer.tsx`**

Add the import. Replace the two item-price lines and the subtotal line (`${item.product.price.toFixed(2)}`, `${item.product.originalPrice.toFixed(2)}`, `${subtotal.toFixed(2)}`) with `{formatCurrency(item.product.price)}`, `{formatCurrency(item.product.originalPrice)}`, `{formatCurrency(subtotal)}` respectively.

- [ ] **Step 6: `CheckoutForm.tsx`**

Add the import. Replace every remaining inline price template in this file:
- `Confirm COD Order - ${grandTotal.toFixed(2)}` → `Confirm COD Order - {formatCurrency(grandTotal)}` (split the button's `<span>` content into JSX expression form).
- `Qty: {item.quantity} × ${item.product.price.toFixed(2)}` → `Qty: {item.quantity} × {formatCurrency(item.product.price)}`.
- `${item.product.originalPrice.toFixed(2)}` → `{formatCurrency(item.product.originalPrice)}`.
- `${(item.product.price * item.quantity).toFixed(2)}` → `{formatCurrency(item.product.price * item.quantity)}`.
- Promotions list: `` `${c.value}% OFF` `` stays as-is (percentage, not currency); `` `$${c.value.toFixed(2)} OFF` `` → `` `${formatCurrency(c.value)} OFF` ``; `` `Minimum order $${c.minOrderSubtotal.toFixed(2)}. ` `` → `` `Minimum order ${formatCurrency(c.minOrderSubtotal)}. ` ``.
- `${subtotal.toFixed(2)}` → `{formatCurrency(subtotal)}`.
- The "Shipping Fee" row (already simplified in Task 3 Step 2) → `{formatCurrency(deliveryFee)}`.
- `-${discountAmount.toFixed(2)}` → `-{formatCurrency(discountAmount)}`.
- `${grandTotal.toFixed(2)}` (grand total row) → `{formatCurrency(grandTotal)}`.

- [ ] **Step 7: `OrderTrackingView.tsx`**

Add the import. Replace the three totals (`${order.totalAmount.toFixed(2)}`, `${(item.price * item.quantity).toFixed(2)}`, `${activeOrder.totalAmount.toFixed(2)}`) with `{formatCurrency(...)}` equivalents.

- [ ] **Step 8: `AdminOrderManager.tsx`**

Add the import. Replace `${(item.price * item.quantity).toFixed(2)}` and `${ord.totalAmount.toFixed(2)}` with `{formatCurrency(...)}` equivalents.

- [ ] **Step 9: `InventoryManager.tsx`**

Add the import. Replace the two product price lines in the inventory table (`${p.price.toFixed(2)}`, `${p.originalPrice.toFixed(2)}`) with `{formatCurrency(...)}` equivalents. Leave the "Sale Price ($)" / "Original Price" **form labels** as-is — those are admin-entry field labels describing the raw numeric input, not a rendered currency amount (out of scope; the underlying values are unitless numbers the admin types in, now displayed as Taka everywhere else).

- [ ] **Step 10: `CouponManager.tsx`**

Add the import. Replace:
```tsx
? `$${c.value.toFixed(2)} off`
```
with:
```tsx
? `${formatCurrency(c.value)} off`
```
and:
```tsx
{c.minOrderSubtotal ? `Min $${c.minOrderSubtotal.toFixed(2)}. ` : ''}
```
with:
```tsx
{c.minOrderSubtotal ? `Min ${formatCurrency(c.minOrderSubtotal)}. ` : ''}
```

- [ ] **Step 11: `coupon.ts` (domain layer validation message)**

Add `import { formatCurrency } from '@/shared/lib/formatCurrency';` to `src/features/coupons/domain/coupon.ts` and replace:
```ts
reason: `This coupon requires a minimum subtotal of $${coupon.minOrderSubtotal?.toFixed(2)}.`,
```
with:
```ts
reason: `This coupon requires a minimum subtotal of ${formatCurrency(coupon.minOrderSubtotal ?? 0)}.`,
```

- [ ] **Step 12: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `grep -rn '\$\${' src/features src/shared --include="*.tsx" --include="*.ts" | grep -v '\.test\.'`
Expected: no output (no more raw `$`-prefixed currency template literals left).

Run: `npm run test`
Expected: all suites pass.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: switch currency display from \$ to ৳ everywhere, centralized through formatCurrency"
```

---

## Task 5: Full verification

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Run all tests**

Run: `npm run test`
Expected: all suites pass, including the rewritten 10 pricing tests and updated 3 formatCurrency tests.

- [ ] **Step 3: Build (dev server stopped first)**

```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null
npm run build
```
Expected: `Compiled successfully`.

- [ ] **Step 4: Restart dev server and smoke-test**

```bash
npm run dev
```
Then confirm `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/checkout` returns `200`.

- [ ] **Step 5: Manual browser check**

Go to checkout, select Dhaka district + DNCC → shipping shows ৳70. Switch city corporation to "Outside City Corporation" with thana "Savar" → shipping shows ৳110. Switch thana to something else entirely (e.g. Mirpur, no city corp) or pick a totally different district → shipping shows ৳130. Confirm all prices across the site (catalog, product detail, cart, checkout, orders, admin) now show ৳ instead of $.
