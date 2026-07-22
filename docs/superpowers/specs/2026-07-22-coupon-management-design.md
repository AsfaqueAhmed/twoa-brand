# Coupon Management System

## Goal
Replace the 4 hardcoded promo codes embedded in `CheckoutForm.tsx` with an admin-manageable,
Firestore-backed coupon system: admins create/edit/deactivate coupons from a new admin tab;
customers apply them at checkout exactly as before, but validation and discount calculation
are now data-driven.

## Decisions (confirmed with user)
1. Full admin CRUD for coupons (new `/admin/coupons` tab), not just direct Firestore console edits.
2. Discount types: `percentage`, `flat`, `free_shipping` — covers all 4 existing codes.
3. Conditions: minimum order subtotal, expiry date, usage limit (total + one-per-customer),
   district restriction.
4. Usage limit is enforced two ways: a total redemption cap (`usageCount` vs `usageLimit`) and
   a per-customer check (does this signed-in user already have an order with this `promoCode`,
   regardless of that order's status — counting cancelled orders too prevents a
   place-then-cancel-then-reapply abuse loop).
5. The checkout "Active Promotions" panel stays, now listing real active/eligible coupons from
   Firestore instead of 4 hardcoded cards.
6. Seed the 4 existing codes as real coupon documents so nothing breaks for existing testers;
   admin can edit or deactivate them afterward.

## Data model
New Firestore collection `coupons`, doc ID = the code itself, uppercased (mirrors the
`categories` collection's slug-as-id pattern):

```ts
interface Coupon {
  code: string;
  discountType: 'percentage' | 'flat' | 'free_shipping';
  value: number;                 // percentage (0-100) or flat $ amount; unused for free_shipping
  minOrderSubtotal?: number;
  districtRestriction?: string;  // district id from bangladeshAreas, e.g. 'dhaka_dist'
  expiresAt?: string;            // ISO date string
  usageLimit?: number;
  usageCount: number;            // starts at 0, incremented on each successful redemption
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## Architecture
Two feature modules, following the codebase's existing customer-facing-vs-admin-write split
(mirrors how `features/catalog` vs `features/admin/inventory` are separated today):

```
features/coupons/                        (customer-facing: read + apply + redeem)
  domain/coupon.ts                       pure validators, computeDiscountAmount
  domain/coupon.test.ts
  infrastructure/firestoreCouponsRepository.ts
    fetchCouponByCode(code): Coupon | null
    fetchActiveCoupons(): Coupon[]
    incrementCouponUsage(code): void
  application/applyCoupon.ts             full validation incl. per-customer reuse check
  application/listActiveCoupons.ts       for the checkout promotions panel

features/admin/coupons/                  (admin-facing: CRUD)
  infrastructure/firestoreCouponAdminRepository.ts
    listAllCoupons(), createCoupon(), updateCoupon(), deleteCoupon()
  presentation/CouponManager.tsx         list table + create/edit modal, mirrors InventoryManager

app/admin/coupons/page.tsx               third admin tab (Inventory | Orders | Coupons)
```

`CheckoutForm.tsx`'s `handleApplyPromo`/`discountAmount` if-else chain is replaced by a call to
`applyCoupon`. `placeOrder` (checkout application layer) calls `incrementCouponUsage` after a
successful order write, alongside the existing stock-decrement step.

## Security (`firestore.rules`)
Add a new match block:
```
match /coupons/{couponId} {
  allow read: if true;
  allow update: if isSignedIn() &&
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['usageCount']) &&
    request.resource.data.usageCount == resource.data.usageCount + 1;
}
```
Admin CRUD is already covered by the existing top-level `isAdmin()` catch-all rule. This new
block only grants signed-in customers permission to increment `usageCount` by exactly 1 — the
same narrow-field-diff pattern already used for customer order cancellation.

## Out of scope
- No payment-gateway integration (coupons only affect the displayed/stored order total; COD
  remains the only payment method).
- No coupon analytics/reporting beyond the raw `usageCount`.
- No stacking multiple coupons on one order (one `promoCode` per order, as today).
