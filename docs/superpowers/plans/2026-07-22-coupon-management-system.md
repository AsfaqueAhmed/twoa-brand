# Coupon Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 4 hardcoded promo codes in `CheckoutForm.tsx` with an admin-manageable, Firestore-backed coupon system.

**Architecture:** New `features/coupons` (customer-facing: validate/apply/redeem) and `features/admin/coupons` (admin CRUD) modules, following the existing `catalog` vs `admin/inventory` split. `CheckoutForm` calls `applyCoupon`/`listActiveCoupons` instead of embedded if/else logic; `placeOrder` calls `incrementCouponUsage` alongside its existing stock-decrement step.

**Tech Stack:** Same as the rest of the app — Next.js App Router, Firebase client SDK, Vitest.

**Design doc:** `docs/superpowers/specs/2026-07-22-coupon-management-design.md`

## Global Constraints

- Coupon doc ID = the code itself, uppercased (e.g. `WELCOME10`), mirroring the `categories` collection's slug-as-id pattern.
- `incrementCouponUsage` writes **only** the `usageCount` field (via `increment(1)`) — never bundle other field writes into that call, since the Firestore rule only permits that one field to change for non-admin writes.
- "Already used" means: the signed-in customer has **any** existing order (regardless of status) with `promoCode` equal to this coupon's code. This intentionally blocks reapplying after cancelling.
- All new TypeScript files must pass `npx tsc --noEmit`.
- Don't touch the `next dev` server's `.next` directory with `next build` while `next dev` is running (established earlier in this session) — run `next build` only after confirming the dev server (if any) is stopped, or accept the dev server needs a restart afterward.

---

## Task 1: Coupon domain

**Files:**
- Create: `src/features/coupons/domain/coupon.ts`
- Test: `src/features/coupons/domain/coupon.test.ts`

**Interfaces:**
- Produces: `DiscountType`, `Coupon`, `CouponValidationResult` types; `isCouponExpired(coupon, now?)`, `isUsageLimitReached(coupon)`, `meetsMinimumSubtotal(coupon, subtotal)`, `meetsDistrictRestriction(coupon, districtId?)`, `computeDiscountAmount(coupon, subtotal, deliveryFee)`, `validateCouponEligibility(coupon, ctx)`.

- [ ] **Step 1: Write failing tests**

`src/features/coupons/domain/coupon.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  isCouponExpired,
  isUsageLimitReached,
  meetsMinimumSubtotal,
  meetsDistrictRestriction,
  computeDiscountAmount,
  validateCouponEligibility,
  type Coupon,
} from './coupon';

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    code: 'TESTCODE',
    discountType: 'percentage',
    value: 10,
    usageCount: 0,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('isCouponExpired', () => {
  it('is false when there is no expiry', () => {
    expect(isCouponExpired(makeCoupon())).toBe(false);
  });
  it('is true when expiresAt is in the past', () => {
    expect(isCouponExpired(makeCoupon({ expiresAt: '2020-01-01T00:00:00.000Z' }))).toBe(true);
  });
  it('is false when expiresAt is in the future', () => {
    expect(isCouponExpired(makeCoupon({ expiresAt: '2099-01-01T00:00:00.000Z' }))).toBe(false);
  });
});

describe('isUsageLimitReached', () => {
  it('is false when there is no limit', () => {
    expect(isUsageLimitReached(makeCoupon({ usageCount: 1000 }))).toBe(false);
  });
  it('is true when usageCount meets the limit', () => {
    expect(isUsageLimitReached(makeCoupon({ usageLimit: 5, usageCount: 5 }))).toBe(true);
  });
  it('is false when usageCount is below the limit', () => {
    expect(isUsageLimitReached(makeCoupon({ usageLimit: 5, usageCount: 4 }))).toBe(false);
  });
});

describe('meetsMinimumSubtotal', () => {
  it('is true when there is no minimum', () => {
    expect(meetsMinimumSubtotal(makeCoupon(), 1)).toBe(true);
  });
  it('is false when subtotal is below the minimum', () => {
    expect(meetsMinimumSubtotal(makeCoupon({ minOrderSubtotal: 100 }), 50)).toBe(false);
  });
  it('is true when subtotal meets the minimum', () => {
    expect(meetsMinimumSubtotal(makeCoupon({ minOrderSubtotal: 100 }), 100)).toBe(true);
  });
});

describe('meetsDistrictRestriction', () => {
  it('is true when there is no restriction', () => {
    expect(meetsDistrictRestriction(makeCoupon(), 'anywhere')).toBe(true);
  });
  it('is false when the district does not match', () => {
    expect(meetsDistrictRestriction(makeCoupon({ districtRestriction: 'dhaka_dist' }), 'gazipur')).toBe(false);
  });
  it('is true when the district matches', () => {
    expect(meetsDistrictRestriction(makeCoupon({ districtRestriction: 'dhaka_dist' }), 'dhaka_dist')).toBe(true);
  });
});

describe('computeDiscountAmount', () => {
  it('computes a percentage discount off the subtotal', () => {
    expect(computeDiscountAmount(makeCoupon({ discountType: 'percentage', value: 10 }), 100, 4.99)).toBe(10);
  });
  it('computes a flat discount', () => {
    expect(computeDiscountAmount(makeCoupon({ discountType: 'flat', value: 5 }), 100, 4.99)).toBe(5);
  });
  it('computes free shipping as the delivery fee', () => {
    expect(computeDiscountAmount(makeCoupon({ discountType: 'free_shipping', value: 0 }), 100, 4.99)).toBe(4.99);
  });
});

describe('validateCouponEligibility', () => {
  it('rejects an inactive coupon', () => {
    const result = validateCouponEligibility(makeCoupon({ isActive: false }), { subtotal: 100, deliveryFee: 4.99 });
    expect(result.valid).toBe(false);
  });
  it('rejects free_shipping when delivery is already free', () => {
    const result = validateCouponEligibility(makeCoupon({ discountType: 'free_shipping' }), {
      subtotal: 200,
      deliveryFee: 0,
    });
    expect(result.valid).toBe(false);
  });
  it('accepts a valid, eligible coupon', () => {
    const result = validateCouponEligibility(makeCoupon(), { subtotal: 100, deliveryFee: 4.99 });
    expect(result.valid).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- coupon.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the domain module**

`src/features/coupons/domain/coupon.ts`:

```ts
export type DiscountType = 'percentage' | 'flat' | 'free_shipping';

export interface Coupon {
  code: string;
  discountType: DiscountType;
  value: number;
  minOrderSubtotal?: number;
  districtRestriction?: string;
  expiresAt?: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function isCouponExpired(coupon: Coupon, now: Date = new Date()): boolean {
  if (!coupon.expiresAt) return false;
  return new Date(coupon.expiresAt).getTime() < now.getTime();
}

export function isUsageLimitReached(coupon: Coupon): boolean {
  if (coupon.usageLimit === undefined) return false;
  return coupon.usageCount >= coupon.usageLimit;
}

export function meetsMinimumSubtotal(coupon: Coupon, subtotal: number): boolean {
  if (coupon.minOrderSubtotal === undefined) return true;
  return subtotal >= coupon.minOrderSubtotal;
}

export function meetsDistrictRestriction(coupon: Coupon, districtId?: string): boolean {
  if (!coupon.districtRestriction) return true;
  return districtId === coupon.districtRestriction;
}

export function computeDiscountAmount(coupon: Coupon, subtotal: number, deliveryFee: number): number {
  if (coupon.discountType === 'percentage') {
    return Math.round(subtotal * (coupon.value / 100) * 100) / 100;
  }
  if (coupon.discountType === 'flat') {
    return coupon.value;
  }
  return deliveryFee;
}

export interface CouponValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateCouponEligibility(
  coupon: Coupon,
  ctx: { subtotal: number; deliveryFee: number; districtId?: string }
): CouponValidationResult {
  if (!coupon.isActive) return { valid: false, reason: 'This coupon is no longer active.' };
  if (isCouponExpired(coupon)) return { valid: false, reason: 'This coupon has expired.' };
  if (isUsageLimitReached(coupon)) return { valid: false, reason: 'This coupon has reached its usage limit.' };
  if (!meetsMinimumSubtotal(coupon, ctx.subtotal)) {
    return {
      valid: false,
      reason: `This coupon requires a minimum subtotal of $${coupon.minOrderSubtotal?.toFixed(2)}.`,
    };
  }
  if (!meetsDistrictRestriction(coupon, ctx.districtId)) {
    return { valid: false, reason: 'This coupon is not valid for your delivery district.' };
  }
  if (coupon.discountType === 'free_shipping' && ctx.deliveryFee === 0) {
    return { valid: false, reason: 'Free shipping is already active for this order.' };
  }
  return { valid: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- coupon.test`
Expected: PASS, 15 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/coupons/domain
git commit -m "feat: add coupon domain (validators, discount calculation)"
```

---

## Task 2: Coupon infrastructure + application (customer-facing)

**Files:**
- Create: `src/features/coupons/infrastructure/firestoreCouponsRepository.ts`
- Create: `src/features/coupons/application/applyCoupon.ts`
- Create: `src/features/coupons/application/listActiveCoupons.ts`

**Interfaces:**
- Produces: `fetchCouponByCode(code): Promise<Coupon | null>`, `fetchActiveCoupons(): Promise<Coupon[]>`, `incrementCouponUsage(code): Promise<void>`, `applyCoupon(params): Promise<ApplyCouponResult>`, `listActiveCoupons(): Promise<Coupon[]>`.
- Consumes: `db` (`@/shared/infrastructure/firebase/app`), `fetchOrdersForUser` (`@/features/orders/infrastructure/firestoreOrdersRepository`), domain functions from Task 1.

- [ ] **Step 1: Implement the Firestore repository**

`src/features/coupons/infrastructure/firestoreCouponsRepository.ts`:

```ts
import { doc, getDoc, getDocs, collection, query, where, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { Coupon } from '../domain/coupon';

function toCoupon(id: string, data: Record<string, any>): Coupon {
  return {
    code: id,
    discountType: data.discountType,
    value: Number(data.value) || 0,
    minOrderSubtotal: data.minOrderSubtotal !== undefined ? Number(data.minOrderSubtotal) : undefined,
    districtRestriction: data.districtRestriction || undefined,
    expiresAt: data.expiresAt || undefined,
    usageLimit: data.usageLimit !== undefined ? Number(data.usageLimit) : undefined,
    usageCount: Number(data.usageCount) || 0,
    isActive: !!data.isActive,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || '',
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || '',
  };
}

export async function fetchCouponByCode(code: string): Promise<Coupon | null> {
  const snap = await getDoc(doc(db, 'coupons', code.toUpperCase()));
  if (!snap.exists()) return null;
  return toCoupon(snap.id, snap.data());
}

export async function fetchActiveCoupons(): Promise<Coupon[]> {
  const q = query(collection(db, 'coupons'), where('isActive', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toCoupon(d.id, d.data()));
}

export async function incrementCouponUsage(code: string): Promise<void> {
  await updateDoc(doc(db, 'coupons', code.toUpperCase()), { usageCount: increment(1) });
}
```

- [ ] **Step 2: Implement `applyCoupon`**

`src/features/coupons/application/applyCoupon.ts`:

```ts
import type { User } from 'firebase/auth';
import { fetchCouponByCode } from '../infrastructure/firestoreCouponsRepository';
import { fetchOrdersForUser } from '@/features/orders/infrastructure/firestoreOrdersRepository';
import { validateCouponEligibility, computeDiscountAmount, type Coupon } from '../domain/coupon';

export interface ApplyCouponResult {
  valid: boolean;
  reason?: string;
  coupon?: Coupon;
  discountAmount?: number;
}

export async function applyCoupon(params: {
  code: string;
  user: User;
  subtotal: number;
  deliveryFee: number;
  districtId?: string;
}): Promise<ApplyCouponResult> {
  const { code, user, subtotal, deliveryFee, districtId } = params;
  const coupon = await fetchCouponByCode(code);
  if (!coupon) return { valid: false, reason: 'Invalid promo code. Please try another one.' };

  const eligibility = validateCouponEligibility(coupon, { subtotal, deliveryFee, districtId });
  if (!eligibility.valid) return { valid: false, reason: eligibility.reason };

  const priorOrders = await fetchOrdersForUser(user.uid);
  const alreadyUsed = priorOrders.some((o) => o.promoCode === coupon.code);
  if (alreadyUsed) {
    return { valid: false, reason: 'You have already used this coupon.' };
  }

  const discountAmount = computeDiscountAmount(coupon, subtotal, deliveryFee);
  return { valid: true, coupon, discountAmount };
}
```

- [ ] **Step 3: Implement `listActiveCoupons`**

`src/features/coupons/application/listActiveCoupons.ts`:

```ts
import { fetchActiveCoupons } from '../infrastructure/firestoreCouponsRepository';
import { isCouponExpired, isUsageLimitReached, type Coupon } from '../domain/coupon';

export async function listActiveCoupons(): Promise<Coupon[]> {
  const coupons = await fetchActiveCoupons();
  return coupons.filter((c) => !isCouponExpired(c) && !isUsageLimitReached(c));
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/coupons/infrastructure src/features/coupons/application
git commit -m "feat: add coupon repository and customer-facing application use-cases"
```

---

## Task 3: Firestore rules + seed the 4 existing codes

**Files:**
- Modify: `firestore.rules`
- Create (temporary, run once then delete): `scripts/seedCoupons.mjs`

**Interfaces:** none — this task only touches Firestore configuration and data.

- [ ] **Step 1: Add the `coupons` match block to `firestore.rules`**

Add this block inside `service cloud.firestore { match /databases/{database}/documents { ... } }`, alongside the existing `products`/`categories`/`orders` blocks (after the `categories` block, before `orders`):

```
    // 1c. Coupons (promo codes)
    match /coupons/{couponId} {
      // Public read so the checkout "Active Promotions" panel and code lookup both work.
      allow read: if true;

      // Signed-in customers may increment usageCount by exactly 1 when redeeming a coupon
      // at checkout — nothing else about the coupon may change via this path.
      allow update: if isSignedIn() &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['usageCount']) &&
        request.resource.data.usageCount == resource.data.usageCount + 1;
    }
```

(Admin already has unrestricted read/write on every collection via the existing top-level `match /{document=**} { allow read, write: if isAdmin(); }` rule — no separate admin-specific block is needed here.)

- [ ] **Step 2: Deploy the updated rules**

Run: `firebase deploy --only firestore:rules`
Expected: `Deploy complete!`. If the `firebase` CLI isn't authenticated in this environment, tell the user to run this command themselves and wait for confirmation before continuing — the seed script in Step 3 doesn't strictly require the new rules (admin SDK/console writes bypass rules), but the app's own coupon reads/writes at runtime do.

- [ ] **Step 3: Write a one-off seed script for the 4 existing codes**

`scripts/seedCoupons.mjs`:

```js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const coupons = [
  {
    code: 'WELCOME10',
    discountType: 'percentage',
    value: 10,
    usageCount: 0,
    isActive: true,
  },
  {
    code: 'FREESHIP',
    discountType: 'free_shipping',
    value: 0,
    usageCount: 0,
    isActive: true,
  },
  {
    code: 'SAVE15',
    discountType: 'percentage',
    value: 15,
    minOrderSubtotal: 100,
    usageCount: 0,
    isActive: true,
  },
  {
    code: 'DHAKALOVE',
    discountType: 'flat',
    value: 5,
    districtRestriction: 'dhaka_dist',
    usageCount: 0,
    isActive: true,
  },
];

for (const coupon of coupons) {
  await setDoc(doc(db, 'coupons', coupon.code), {
    ...coupon,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  console.log(`Seeded ${coupon.code}`);
}

process.exit(0);
```

- [ ] **Step 4: Run the seed script**

Run: `node scripts/seedCoupons.mjs`
Expected: prints `Seeded WELCOME10`, `Seeded FREESHIP`, `Seeded SAVE15`, `Seeded DHAKALOVE`.

If this fails with a permission error, it means the deployed rules from Step 2 don't yet allow this write path (the script writes as an anonymous/unauthenticated client, which isn't covered by either the public `allow read` or the customer `allow update` rule — both only permit specific patterns, not arbitrary `setDoc` from an unauthenticated caller). In that case, run the same seed logic from the Firebase Console's Firestore data editor instead (create 4 documents in the `coupons` collection by hand using the field values above), or temporarily add `allow write: if true;` to the `coupons` rule, run the script, then remove it and redeploy.

- [ ] **Step 5: Delete the seed script**

```bash
rm scripts/seedCoupons.mjs
```

- [ ] **Step 6: Commit**

```bash
git add firestore.rules
git commit -m "feat: add coupons collection security rules"
```

---

## Task 4: Admin coupons feature (CRUD)

**Files:**
- Create: `src/features/admin/coupons/infrastructure/firestoreCouponAdminRepository.ts`
- Create: `src/features/admin/coupons/presentation/CouponManager.tsx`
- Create: `src/app/admin/coupons/page.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/orders/page.tsx`

**Interfaces:**
- Produces: `listAllCoupons()`, `createCoupon(payload)`, `updateCoupon(code, payload)`, `deleteCoupon(code)`, `<CouponManager />`.
- Consumes: `Coupon`, `DiscountType` (Task 1), `db` (`@/shared/infrastructure/firebase/app`).

- [ ] **Step 1: Implement the admin repository**

`src/features/admin/coupons/infrastructure/firestoreCouponAdminRepository.ts`:

```ts
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { Coupon, DiscountType } from '@/features/coupons/domain/coupon';

export interface CouponFormPayload {
  code: string;
  discountType: DiscountType;
  value: number;
  minOrderSubtotal?: number;
  districtRestriction?: string;
  expiresAt?: string;
  usageLimit?: number;
  isActive: boolean;
}

function toCoupon(id: string, data: Record<string, any>): Coupon {
  return {
    code: id,
    discountType: data.discountType,
    value: Number(data.value) || 0,
    minOrderSubtotal: data.minOrderSubtotal !== undefined ? Number(data.minOrderSubtotal) : undefined,
    districtRestriction: data.districtRestriction || undefined,
    expiresAt: data.expiresAt || undefined,
    usageLimit: data.usageLimit !== undefined ? Number(data.usageLimit) : undefined,
    usageCount: Number(data.usageCount) || 0,
    isActive: !!data.isActive,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || '',
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || '',
  };
}

export async function listAllCoupons(): Promise<Coupon[]> {
  const snap = await getDocs(collection(db, 'coupons'));
  return snap.docs.map((d) => toCoupon(d.id, d.data()));
}

export async function createCoupon(payload: CouponFormPayload): Promise<void> {
  const id = payload.code.trim().toUpperCase();
  await setDoc(doc(db, 'coupons', id), {
    ...payload,
    code: id,
    usageCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCoupon(code: string, payload: Partial<CouponFormPayload>): Promise<void> {
  await setDoc(doc(db, 'coupons', code.toUpperCase()), { ...payload, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteCoupon(code: string): Promise<void> {
  await deleteDoc(doc(db, 'coupons', code.toUpperCase()));
}
```

- [ ] **Step 2: Implement `CouponManager`**

`src/features/admin/coupons/presentation/CouponManager.tsx` — list table (code, type, value, conditions, usage, active toggle, edit/delete) + create/edit modal form, modeled on `InventoryManager`'s product editor:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Coupon, DiscountType } from '@/features/coupons/domain/coupon';
import {
  listAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  type CouponFormPayload,
} from '../infrastructure/firestoreCouponAdminRepository';

const DISCOUNT_TYPES: { value: DiscountType; label: string }[] = [
  { value: 'percentage', label: 'Percentage off' },
  { value: 'flat', label: 'Flat amount off' },
  { value: 'free_shipping', label: 'Free shipping' },
];

const emptyForm: CouponFormPayload = {
  code: '',
  discountType: 'percentage',
  value: 10,
  minOrderSubtotal: undefined,
  districtRestriction: undefined,
  expiresAt: undefined,
  usageLimit: undefined,
  isActive: true,
};

export default function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingExistingCode, setIsEditingExistingCode] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormPayload>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCoupons(await listAllCoupons());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openCreate = () => {
    setForm(emptyForm);
    setIsEditingExistingCode(null);
    setError('');
    setIsEditing(true);
  };

  const openEdit = (coupon: Coupon) => {
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      value: coupon.value,
      minOrderSubtotal: coupon.minOrderSubtotal,
      districtRestriction: coupon.districtRestriction,
      expiresAt: coupon.expiresAt,
      usageLimit: coupon.usageLimit,
      isActive: coupon.isActive,
    });
    setIsEditingExistingCode(coupon.code);
    setError('');
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      setError('Please provide a coupon code.');
      return;
    }
    if (form.discountType === 'percentage' && (form.value <= 0 || form.value > 100)) {
      setError('Percentage discounts must be between 1 and 100.');
      return;
    }
    if (form.discountType === 'flat' && form.value <= 0) {
      setError('Flat discount amount must be greater than 0.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      if (isEditingExistingCode) {
        await updateCoupon(isEditingExistingCode, form);
      } else {
        await createCoupon(form);
      }
      await refresh();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save coupon.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!window.confirm(`Delete coupon ${code}? This cannot be undone.`)) return;
    await deleteCoupon(code);
    await refresh();
  };

  const handleToggleActive = async (coupon: Coupon) => {
    await updateCoupon(coupon.code, { isActive: !coupon.isActive });
    await refresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between bg-[#FAF9F6] border border-[#EEEEEE] p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-black">Coupons</h2>
        <button
          onClick={openCreate}
          className="flex items-center justify-center space-x-2 rounded-none bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#333333] transition-colors"
          id="admin-add-coupon-btn"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Coupon</span>
        </button>
      </div>

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 15 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-none border border-[#EEEEEE] bg-[#FDFDFD] shadow-2xl p-6 sm:p-8"
            >
              <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-4 mb-6">
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-black">
                  {isEditingExistingCode ? 'Edit Coupon' : 'Add New Coupon'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-[#717171] hover:text-black border border-[#EEEEEE] p-1.5"
                >
                  <XCircle className="h-4.5 w-4.5" />
                </button>
              </div>

              {error && <div className="bg-red-50 text-red-800 border border-red-200 text-xs p-4 mb-6 font-medium">{error}</div>}

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">Code*</label>
                  <input
                    type="text"
                    required
                    disabled={!!isEditingExistingCode}
                    value={form.code}
                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SUMMER20"
                    className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none disabled:bg-[#F5F5F5] disabled:text-[#919191] font-mono uppercase"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">Discount Type*</label>
                    <select
                      value={form.discountType}
                      onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as DiscountType }))}
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                    >
                      {DISCOUNT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.discountType !== 'free_shipping' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                        Value{form.discountType === 'percentage' ? ' (%)' : ' ($)'}*
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.value}
                        onChange={(e) => setForm((prev) => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                        className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                      Minimum Order Subtotal ($, optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.minOrderSubtotal ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, minOrderSubtotal: e.target.value ? parseFloat(e.target.value) : undefined }))
                      }
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                      Usage Limit (optional)
                    </label>
                    <input
                      type="number"
                      value={form.usageLimit ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, usageLimit: e.target.value ? parseInt(e.target.value, 10) : undefined }))
                      }
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                      District Restriction (optional)
                    </label>
                    <input
                      type="text"
                      value={form.districtRestriction ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, districtRestriction: e.target.value || undefined }))}
                      placeholder="e.g. dhaka_dist"
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                      Expires At (optional)
                    </label>
                    <input
                      type="date"
                      value={form.expiresAt ? form.expiresAt.slice(0, 10) : ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined }))
                      }
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  />
                  <span>Active</span>
                </label>

                <div className="border-t border-[#EEEEEE] pt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="border border-[#EEEEEE] hover:border-black text-black text-xs font-bold uppercase tracking-widest px-6 py-3.5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-black hover:bg-[#333333] text-white text-xs font-bold uppercase tracking-widest px-8 py-3.5 transition-colors disabled:bg-[#717171]"
                  >
                    {isSaving ? 'Saving...' : 'Save Coupon'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto border border-[#EEEEEE] bg-white rounded-none shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF9F6] border-b border-[#EEEEEE] text-[10px] font-bold uppercase tracking-wider text-[#717171]">
              <th className="py-4 px-6">Code</th>
              <th className="py-4 px-6">Discount</th>
              <th className="py-4 px-6">Conditions</th>
              <th className="py-4 px-6">Usage</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE] text-xs text-[#1A1A1A]">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#717171] font-semibold">
                  Loading coupons...
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#717171] font-semibold">
                  No coupons yet. Add one to get started.
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.code} className="hover:bg-[#FAF9F6]/50 transition-colors">
                  <td className="py-4 px-6 font-mono font-bold">{c.code}</td>
                  <td className="py-4 px-6">
                    {c.discountType === 'percentage'
                      ? `${c.value}% off`
                      : c.discountType === 'flat'
                        ? `$${c.value.toFixed(2)} off`
                        : 'Free shipping'}
                  </td>
                  <td className="py-4 px-6 text-[10px] text-[#717171]">
                    {c.minOrderSubtotal ? `Min $${c.minOrderSubtotal.toFixed(2)}. ` : ''}
                    {c.districtRestriction ? `District: ${c.districtRestriction}. ` : ''}
                    {c.expiresAt ? `Expires ${new Date(c.expiresAt).toLocaleDateString()}.` : ''}
                  </td>
                  <td className="py-4 px-6 font-mono">
                    {c.usageCount}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => handleToggleActive(c)}
                      className={`px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider ${
                        c.isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-[#F5F5F5] text-[#717171] border-[#EEEEEE]'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => openEdit(c)}
                      className="inline-flex items-center space-x-1 border border-[#EEEEEE] bg-white hover:border-black p-2 text-black transition-colors"
                      title="Edit Coupon"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.code)}
                      className="inline-flex items-center space-x-1 border border-red-200 bg-white hover:bg-red-50 p-2 text-red-600 transition-colors"
                      title="Delete Coupon"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the admin coupons route**

`src/app/admin/coupons/page.tsx`:

```tsx
'use client';

import Link from 'next/link';
import Navbar from '@/features/catalog/presentation/Navbar';
import RequireAdmin from '@/features/auth/presentation/RequireAdmin';
import CouponManager from '@/features/admin/coupons/presentation/CouponManager';

export default function AdminCouponsPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <RequireAdmin>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
            <div className="flex items-center gap-2 mb-6 border-b border-[#EEEEEE] pb-4">
              <Link href="/admin" className="text-xs font-bold uppercase tracking-wider text-[#717171] hover:text-black pb-4 -mb-4">
                Inventory
              </Link>
              <Link href="/admin/orders" className="text-xs font-bold uppercase tracking-wider text-[#717171] hover:text-black pb-4 -mb-4">
                Orders
              </Link>
              <span className="text-xs font-bold uppercase tracking-wider text-black border-b-2 border-black pb-4 -mb-4">Coupons</span>
            </div>
            <CouponManager />
          </div>
        </RequireAdmin>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Add the Coupons tab link to the other two admin pages**

Modify `src/app/admin/page.tsx` — inside the tab bar `div`, after the "Orders" `<Link>`, add:

```tsx
              <Link
                href="/admin/coupons"
                className="text-xs font-bold uppercase tracking-wider text-[#717171] hover:text-black pb-4 -mb-4"
              >
                Coupons
              </Link>
```

Modify `src/app/admin/orders/page.tsx` — inside the tab bar `div`, after the "Orders" `<span>` (the current-tab indicator), add the same `<Link href="/admin/coupons">Coupons</Link>` block.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/coupons src/app/admin
git commit -m "feat: add admin coupon management (CRUD) and /admin/coupons route"
```

---

## Task 5: Wire checkout to the coupon system

**Files:**
- Modify: `src/features/checkout/application/placeOrder.ts`
- Modify: `src/features/checkout/presentation/CheckoutForm.tsx`

**Interfaces:**
- Consumes: `applyCoupon`, `listActiveCoupons`, `incrementCouponUsage` (Task 2), `meetsMinimumSubtotal`, `meetsDistrictRestriction` (Task 1).

- [ ] **Step 1: Call `incrementCouponUsage` from `placeOrder`**

Modify `src/features/checkout/application/placeOrder.ts` — add the import:

```ts
import { incrementCouponUsage } from '@/features/coupons/infrastructure/firestoreCouponsRepository';
```

Immediately after the existing `await createOrder(orderId, payload);` line, add:

```ts
  if (deliveryDetails.promoCode) {
    await incrementCouponUsage(deliveryDetails.promoCode);
  }
```

- [ ] **Step 2: Replace `CheckoutForm`'s hardcoded promo state and handlers**

In `src/features/checkout/presentation/CheckoutForm.tsx`:

1. Add imports:
   ```ts
   import type { Coupon } from '@/features/coupons/domain/coupon';
   import { applyCoupon } from '@/features/coupons/application/applyCoupon';
   import { listActiveCoupons } from '@/features/coupons/application/listActiveCoupons';
   import { meetsMinimumSubtotal, meetsDistrictRestriction } from '@/features/coupons/domain/coupon';
   ```

2. Replace:
   ```ts
   const [appliedPromoCode, setAppliedPromoCode] = useState('');
   ```
   with:
   ```ts
   const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
   const [appliedDiscountAmount, setAppliedDiscountAmount] = useState(0);
   const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);

   useEffect(() => {
     listActiveCoupons().then(setActiveCoupons);
   }, []);
   ```
   (Add `useEffect` to the `import { useState } from 'react';` line → `import { useState, useEffect } from 'react';`.)

3. Replace the entire discount calculation block:
   ```ts
   // Calculate discount
   let discountAmount = 0;
   if (appliedPromoCode === 'WELCOME10') {
     discountAmount = Math.round(subtotal * 0.1 * 100) / 100;
   } else if (appliedPromoCode === 'FREESHIP') {
     discountAmount = deliveryFee;
   } else if (appliedPromoCode === 'SAVE15') {
     discountAmount = Math.round(subtotal * 0.15 * 100) / 100;
   } else if (appliedPromoCode === 'DHAKALOVE') {
     discountAmount = districtId === 'dhaka_dist' ? 5.0 : 0;
   }
   ```
   with:
   ```ts
   const discountAmount = appliedCoupon ? appliedDiscountAmount : 0;
   ```

4. Replace `handleApplyPromo` entirely:
   ```ts
   const handleApplyPromo = async (code: string) => {
     setPromoError('');
     setPromoSuccess('');
     const cleanCode = code.trim().toUpperCase();
     if (!cleanCode) {
       setPromoError('Please enter a promo code.');
       return;
     }
     if (!user) return;
     const result = await applyCoupon({
       code: cleanCode,
       user,
       subtotal,
       deliveryFee,
       districtId: districtId || undefined,
     });
     if (!result.valid || !result.coupon) {
       setPromoError(result.reason || 'Invalid promo code. Please try another one.');
       return;
     }
     setAppliedCoupon(result.coupon);
     setAppliedDiscountAmount(result.discountAmount || 0);
     setPromoSuccess(`Promo ${result.coupon.code} applied!`);
   };
   ```

5. Replace `handleRemovePromo`:
   ```ts
   const handleRemovePromo = () => {
     setAppliedCoupon(null);
     setAppliedDiscountAmount(0);
     setPromoInput('');
     setPromoSuccess('');
     setPromoError('');
   };
   ```

6. In `handleSubmit`, replace:
   ```ts
   promoCode: appliedPromoCode || undefined,
   ```
   with:
   ```ts
   promoCode: appliedCoupon?.code,
   ```

7. Replace every remaining `appliedPromoCode` reference in the JSX (the "Code Applied" banner and the `Discount (${appliedPromoCode})` label) with `appliedCoupon?.code`.

8. Replace the entire hardcoded "Available Offers Accordion/List" `<div className="space-y-2">...</div>` block (the four `WELCOME10`/`FREESHIP`/`SAVE15`/`DHAKALOVE` `onClick` cards) with:
   ```tsx
   <div className="space-y-2">
     {activeCoupons
       .filter(
         (c) =>
           meetsMinimumSubtotal(c, subtotal) &&
           meetsDistrictRestriction(c, districtId || undefined) &&
           !(c.discountType === 'free_shipping' && deliveryFee === 0)
       )
       .map((c) => (
         <div
           key={c.code}
           onClick={() => {
             setPromoInput(c.code);
             handleApplyPromo(c.code);
           }}
           className={`border p-2 bg-white cursor-pointer transition-all duration-200 text-left ${
             appliedCoupon?.code === c.code ? 'border-black bg-black/5' : 'border-dashed border-[#DDDDDD] hover:border-black'
           }`}
         >
           <div className="flex items-center justify-between">
             <span className="text-[10px] font-bold text-black font-mono tracking-wider">{c.code}</span>
             <span className="text-[8px] font-bold uppercase tracking-wider bg-black text-white px-1.5 py-0.5">
               {c.discountType === 'percentage'
                 ? `${c.value}% OFF`
                 : c.discountType === 'flat'
                   ? `$${c.value.toFixed(2)} OFF`
                   : 'FREE SHIPPING'}
             </span>
           </div>
           <p className="text-[9px] text-[#717171] mt-0.5">
             {c.minOrderSubtotal ? `Minimum order $${c.minOrderSubtotal.toFixed(2)}. ` : ''}
             {c.districtRestriction ? 'Restricted delivery area.' : ''}
           </p>
         </div>
       ))}
     {activeCoupons.length === 0 && <p className="text-[9px] text-[#919191] italic">No active promotions right now.</p>}
   </div>
   ```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors — in particular, no leftover references to `appliedPromoCode`.

Run: `grep -n "appliedPromoCode" src/features/checkout/presentation/CheckoutForm.tsx`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/features/checkout
git commit -m "feat: wire checkout to the Firestore-backed coupon system"
```

---

## Task 6: Full verification

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Run all tests**

Run: `npm run test`
Expected: all suites pass, including the new 15 coupon domain tests.

- [ ] **Step 3: Build (only if the dev server is stopped)**

Confirm no `next dev` process is running on port 3000 first (`lsof -ti:3000`). If one is running, skip this step and tell the user to check `/admin/coupons` and checkout manually instead, or stop the dev server and restart it after this step.

Run: `npm run build`
Expected: `Compiled successfully`; route list includes `/admin/coupons`.

- [ ] **Step 4: Restart the dev server and smoke-test**

```bash
npm run dev
```

Then:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/coupons
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/checkout
```
Expected: both `200`.

- [ ] **Step 5: Manual browser check**

With the dev server running, sign in as the admin account, visit `/admin/coupons`, confirm the 4 seeded coupons appear, create a test coupon, edit it, toggle it inactive, and delete it. Then add an item to cart, go to checkout, confirm the "Active Promotions" panel lists eligible active coupons, apply one, confirm the discount reflects in the total, place the order, and confirm the coupon's `usageCount` incremented in `/admin/coupons`.
