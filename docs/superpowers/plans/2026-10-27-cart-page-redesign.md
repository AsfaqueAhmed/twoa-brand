# Cart Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cart drawer with a full `/cart` page (items table, order summary, trust badges, recommendations).

**Architecture:** Pure domain functions in `features/cart/domain` (savings, discount %, variant change, recommendations) are TDD'd first. `CartProvider` gains `changeVariant` and loses drawer state. New presentation components compose a `CartPage` mounted at `src/app/cart/page.tsx`; the Navbar links to it and `CartDrawer` is deleted.

**Tech Stack:** Next.js (app router), React, TypeScript, Tailwind, lucide-react, motion/react, vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-27-cart-page-redesign-design.md`.
- Subtotal = `computeSubtotal(items)` (sale prices, identical to checkout). Total = Subtotal. "You save" is informational and never subtracted. No promo input and no delivery fee on the cart page.
- Out-of-stock products never appear in recommendations; cart items are excluded; max 6.
- Follow existing style: path alias `@/`, `formatCurrency` from `@/shared/lib/formatCurrency`, existing palette (`#EEEEEE` borders, `#717171` muted text, black buttons, `rounded-none`).
- Commands run from the worktree root `/Users/technonext/Documents/e-commerce-app-cart-redesign`. `npm test` = `vitest run`; `npm run lint` = `tsc --noEmit`.
- Worktree has no `node_modules`; run `npm install` once in Task 1 if missing.

## File Structure

- Modify `src/features/cart/domain/cart.ts` — add `computeSavings`, `discountPercent`, `changeVariant`.
- Modify `src/features/cart/domain/cart.test.ts` — tests for the above.
- Create `src/features/cart/domain/recommendations.ts` + `recommendations.test.ts` — `pickRecommendations`.
- Modify `src/features/cart/presentation/CartProvider.tsx` — add `changeVariant`; remove `isOpen/openCart/closeCart`.
- Create `src/features/cart/presentation/CartItemRow.tsx`, `OrderSummary.tsx`, `TrustBadges.tsx`, `CartRecommendations.tsx`, `CartPage.tsx`.
- Create `src/app/cart/page.tsx`.
- Modify `src/features/catalog/presentation/Navbar.tsx` — cart buttons navigate to `/cart`.
- Modify `src/app/layout.tsx` — remove `<CartDrawer />`.
- Delete `src/features/cart/presentation/CartDrawer.tsx`.

---

### Task 1: Cart domain — savings, discount percent, variant change

**Files:**
- Modify: `src/features/cart/domain/cart.ts`
- Test: `src/features/cart/domain/cart.test.ts`

**Interfaces:**
- Produces:
  - `computeSavings(items: CartItem[]): number`
  - `discountPercent(product: Product): number | undefined`
  - `changeVariant(items: CartItem[], productId: string, selectedSize: string | undefined, oldVariant: ProductVariant | undefined, newVariant: ProductVariant): CartItem[]`

- [ ] **Step 1: Ensure dependencies**

Run: `ls node_modules >/dev/null 2>&1 || npm install`

- [ ] **Step 2: Write the failing tests**

In `cart.test.ts`, extend the import line to:

```ts
import {
  addItem, updateItemQuantity, removeItem, computeSubtotal, computeCartCount,
  computeSavings, discountPercent, changeVariant,
} from './cart';
```

and import `ProductVariant` in the types import: `import type { CartItem, ParentProduct, Product, ProductVariant } from '@/shared/domain/types';`

Append at end of file:

```ts
describe('cart savings and variants', () => {
  const black: ProductVariant = { id: 'v-black', name: 'Black' };
  const white: ProductVariant = { id: 'v-white', name: 'White' };

  it('discountPercent rounds and is undefined without a discount', () => {
    expect(discountPercent({ ...product, price: 690, originalPrice: 990 })).toBe(30);
    expect(discountPercent(product)).toBeUndefined();
    expect(discountPercent({ ...product, price: 10, originalPrice: 10 })).toBeUndefined();
  });

  it('computeSavings sums (originalPrice - price) * qty only for discounted items', () => {
    const items: CartItem[] = [
      { product: { ...product, price: 690, originalPrice: 990 }, quantity: 2, selectedSize: 'M' },
      { product: { ...product, id: 'p2', price: 590 }, quantity: 1, selectedSize: 'M' },
    ];
    expect(computeSavings(items)).toBe(600);
    expect(computeSavings([])).toBe(0);
  });

  it('changeVariant updates the line in place when no line has the new variant', () => {
    const items: CartItem[] = [{ product, quantity: 2, selectedSize: 'M', selectedVariant: black }];
    const result = changeVariant(items, 'p1', 'M', black, white);
    expect(result).toEqual([{ product, quantity: 2, selectedSize: 'M', selectedVariant: white }]);
  });

  it('changeVariant merges into an existing line, capped at stock', () => {
    const items: CartItem[] = [
      { product, quantity: 2, selectedSize: 'M', selectedVariant: black },
      { product, quantity: 2, selectedSize: 'M', selectedVariant: white },
    ];
    const result = changeVariant(items, 'p1', 'M', black, white);
    expect(result).toHaveLength(1);
    expect(result[0].selectedVariant).toEqual(white);
    expect(result[0].quantity).toBe(3); // stock is 3
  });

  it('changeVariant is a no-op for the same variant or an unknown line', () => {
    const items: CartItem[] = [{ product, quantity: 1, selectedSize: 'M', selectedVariant: black }];
    expect(changeVariant(items, 'p1', 'M', black, black)).toBe(items);
    expect(changeVariant(items, 'nope', 'M', black, white)).toBe(items);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/features/cart/domain/cart.test.ts`
Expected: FAIL — `computeSavings` / `discountPercent` / `changeVariant` is not a function.

- [ ] **Step 4: Implement**

Append to `cart.ts`:

```ts
export function computeSavings(items: CartItem[]): number {
  return items.reduce((acc, { product, quantity }) => {
    const original = product.originalPrice;
    return original && original > product.price ? acc + (original - product.price) * quantity : acc;
  }, 0);
}

export function discountPercent(product: Product): number | undefined {
  const original = product.originalPrice;
  if (!original || original <= product.price) return undefined;
  return Math.round(((original - product.price) / original) * 100);
}

export function changeVariant(
  items: CartItem[],
  productId: string,
  selectedSize: string | undefined,
  oldVariant: ProductVariant | undefined,
  newVariant: ProductVariant
): CartItem[] {
  if (oldVariant?.id === newVariant.id) return items;
  const source = items.find((item) => matches(item, productId, selectedSize, oldVariant?.id));
  if (!source) return items;

  const target = items.find((item) => matches(item, productId, selectedSize, newVariant.id));
  if (!target) {
    return items.map((item) => (item === source ? { ...item, selectedVariant: newVariant } : item));
  }
  const stock = resolveAvailableStock(source.product, selectedSize);
  if (stock <= 0) return items;
  const mergedQty = Math.min(stock, target.quantity + source.quantity);
  return items
    .filter((item) => item !== source)
    .map((item) => (item === target ? { ...item, quantity: mergedQty } : item));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/features/cart/domain/cart.test.ts`
Expected: PASS (all tests, old and new).

- [ ] **Step 6: Commit**

```bash
git add src/features/cart/domain/cart.ts src/features/cart/domain/cart.test.ts
git commit -m "feat: add cart savings, discount percent and variant change logic

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Recommendations domain

**Files:**
- Create: `src/features/cart/domain/recommendations.ts`
- Test: `src/features/cart/domain/recommendations.test.ts`

**Interfaces:**
- Consumes: `isProductOutOfStock` from `@/shared/domain/stock`.
- Produces: `pickRecommendations(all: Product[], cartItems: CartItem[], limit?: number): Product[]` (default limit 6).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { pickRecommendations } from './recommendations';
import type { CartItem, ParentProduct, Product } from '@/shared/domain/types';

const inStock: ParentProduct = { id: 'pp', name: 'pool', sizeOrder: ['M'], stockBySize: { M: 5 } };
const soldOut: ParentProduct = { id: 'pp0', name: 'pool0', sizeOrder: ['M'], stockBySize: { M: 0 } };

const make = (id: string, category: string, rating: number, parentProduct: ParentProduct = inStock): Product => ({
  id, name: id, description: '', price: 10, image: '', category, rating, parentProduct,
});

describe('pickRecommendations', () => {
  const cartItems: CartItem[] = [{ product: make('a', 'Tees', 4), quantity: 1, selectedSize: 'M' }];

  it('excludes cart items and out-of-stock products', () => {
    const all = [make('a', 'Tees', 4), make('b', 'Tees', 3, soldOut), make('c', 'Tees', 3)];
    expect(pickRecommendations(all, cartItems).map((p) => p.id)).toEqual(['c']);
  });

  it('prefers same-category products, then fills with top-rated others', () => {
    const all = [make('x', 'Hoodies', 5), make('c', 'Tees', 2), make('y', 'Hoodies', 4)];
    expect(pickRecommendations(all, cartItems).map((p) => p.id)).toEqual(['c', 'x', 'y']);
  });

  it('respects the limit', () => {
    const all = Array.from({ length: 10 }, (_, i) => make(`p${i}`, 'Tees', 1));
    expect(pickRecommendations(all, cartItems, 4)).toHaveLength(4);
  });

  it('returns top-rated products when the cart is empty', () => {
    const all = [make('x', 'A', 1), make('y', 'B', 5)];
    expect(pickRecommendations(all, []).map((p) => p.id)).toEqual(['y', 'x']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/cart/domain/recommendations.test.ts`
Expected: FAIL — cannot find module `./recommendations`.

- [ ] **Step 3: Implement**

```ts
import type { CartItem, Product } from '@/shared/domain/types';
import { isProductOutOfStock } from '@/shared/domain/stock';

export function pickRecommendations(all: Product[], cartItems: CartItem[], limit = 6): Product[] {
  const inCart = new Set(cartItems.map((item) => item.product.id));
  const categories = new Set(cartItems.map((item) => item.product.category));
  const candidates = all.filter((p) => !inCart.has(p.id) && !isProductOutOfStock(p));

  const byRating = (a: Product, b: Product) => b.rating - a.rating;
  const sameCategory = candidates.filter((p) => categories.has(p.category)).sort(byRating);
  const others = candidates.filter((p) => !categories.has(p.category)).sort(byRating);
  return [...sameCategory, ...others].slice(0, limit);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/cart/domain/recommendations.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/cart/domain/recommendations.ts src/features/cart/domain/recommendations.test.ts
git commit -m "feat: add cart recommendations picker

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: CartProvider — add changeVariant

**Files:**
- Modify: `src/features/cart/presentation/CartProvider.tsx`

**Interfaces:**
- Consumes: `changeVariant` from Task 1.
- Produces: `useCart().changeVariant(productId: string, selectedSize: string | undefined, oldVariant: ProductVariant | undefined, newVariant: ProductVariant): void`. (Drawer state is removed in Task 6, not here, so the app keeps compiling.)

- [ ] **Step 1: Edit the provider**

Change the domain import to:

```ts
import {
  addItem, updateItemQuantity, removeItem, changeVariant,
  computeSubtotal, computeCartCount,
} from '../domain/cart';
```

Add to `CartContextValue` after `removeFromCart`:

```ts
  changeVariant: (
    productId: string,
    selectedSize: string | undefined,
    oldVariant: ProductVariant | undefined,
    newVariant: ProductVariant
  ) => void;
```

Add to `value` after `removeFromCart`:

```ts
    changeVariant: (productId, selectedSize, oldVariant, newVariant) =>
      setItems((prev) => changeVariant(prev, productId, selectedSize, oldVariant, newVariant)),
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/cart/presentation/CartProvider.tsx
git commit -m "feat: expose changeVariant from CartProvider

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Cart page UI (row, summary, badges, page, route)

**Files:**
- Create: `src/features/cart/presentation/CartItemRow.tsx`
- Create: `src/features/cart/presentation/OrderSummary.tsx`
- Create: `src/features/cart/presentation/TrustBadges.tsx`
- Create: `src/features/cart/presentation/CartPage.tsx`
- Create: `src/app/cart/page.tsx`

**Interfaces:**
- Consumes: `useCart()` (items, subtotal, count, updateQuantity, removeFromCart, changeVariant), `computeSavings`, `discountPercent`, `resolveAvailableStock`, `formatCurrency`.
- Produces: default exports `CartItemRow({ item: CartItem })`, `OrderSummary()`, `TrustBadges()`, `CartPage()`. `CartPage` omits recommendations here; Task 5 mounts them.

- [ ] **Step 1: Create `CartItemRow.tsx`**

```tsx
'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem } from '@/shared/domain/types';
import { resolveAvailableStock } from '@/shared/domain/stock';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { discountPercent } from '../domain/cart';
import { useCart } from './CartProvider';

export const CART_ROW_GRID =
  'sm:grid sm:grid-cols-[minmax(0,1fr)_110px_130px_100px_40px] sm:items-center sm:gap-4';

export default function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeFromCart, changeVariant } = useCart();
  const { product, quantity, selectedSize, selectedVariant } = item;
  const stock = resolveAvailableStock(product, selectedSize);
  const percent = discountPercent(product);
  const variants = product.variants ?? [];
  const itemKey = `${product.id}-${selectedSize || 'nosize'}-${selectedVariant?.id || 'novariant'}`;

  return (
    <div className={`${CART_ROW_GRID} flex flex-col gap-4 py-5 border-b border-[#EEEEEE] last:border-b-0`} id={`cart-row-${itemKey}`}>
      {/* Product */}
      <div className="flex gap-4 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selectedVariant?.image || product.image}
          alt={product.name}
          className="h-24 w-20 shrink-0 object-cover bg-[#F5F5F5]"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-bold text-black truncate">{product.name}</h3>
          {selectedVariant && <p className="text-xs text-[#717171]">Color: {selectedVariant.name}</p>}
          {selectedSize && <p className="text-xs text-[#717171]">Size: {selectedSize}</p>}
          {variants.length > 1 && (
            <div className="flex gap-1.5 pt-1">
              {variants.map((v) => {
                const active = v.id === selectedVariant?.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    title={v.name}
                    aria-label={`Change color to ${v.name}`}
                    aria-pressed={active}
                    onClick={() => changeVariant(product.id, selectedSize, selectedVariant, v)}
                    className={`h-8 w-8 overflow-hidden border ${active ? 'border-black ring-1 ring-black' : 'border-[#EEEEEE]'}`}
                  >
                    {v.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.image} alt={v.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="block h-full w-full" style={{ backgroundColor: v.colorCode || '#EEEEEE' }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="flex items-center gap-2 sm:block">
        <p className="text-sm font-bold text-black">{formatCurrency(product.price)}</p>
        {percent !== undefined && (
          <>
            <p className="text-xs text-[#717171] line-through">{formatCurrency(product.originalPrice!)}</p>
            <span className="inline-block bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
              {percent}% off
            </span>
          </>
        )}
      </div>

      {/* Quantity */}
      <div className="flex items-center border border-[#EEEEEE] w-fit">
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={() => updateQuantity(product.id, quantity - 1, selectedSize, selectedVariant)}
          className="h-9 w-9 flex items-center justify-center hover:bg-[#F5F5F5]"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-9 text-center text-sm font-bold">{quantity}</span>
        <button
          type="button"
          aria-label="Increase quantity"
          disabled={quantity >= stock}
          onClick={() => updateQuantity(product.id, quantity + 1, selectedSize, selectedVariant)}
          className="h-9 w-9 flex items-center justify-center hover:bg-[#F5F5F5] disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Line total */}
      <p className="text-sm font-bold text-black">{formatCurrency(product.price * quantity)}</p>

      {/* Remove */}
      <button
        type="button"
        aria-label={`Remove ${product.name}`}
        onClick={() => removeFromCart(product.id, selectedSize, selectedVariant)}
        className="p-2 text-[#717171] hover:bg-[#F5F5F5] hover:text-black transition-colors w-fit"
        id={`remove-item-btn-${itemKey}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `TrustBadges.tsx`**

```tsx
import { Package, ShieldCheck, Truck } from 'lucide-react';

const BADGES = [
  { Icon: Package, title: '100% Risk-Free', subtitle: 'Shop with confidence' },
  { Icon: Truck, title: 'Nationwide Delivery', subtitle: 'All over Bangladesh' },
  { Icon: ShieldCheck, title: 'Cash on Delivery', subtitle: 'Pay when you receive' },
];

export default function TrustBadges() {
  return (
    <div className="grid grid-cols-3 gap-2 pt-2">
      {BADGES.map(({ Icon, title, subtitle }) => (
        <div key={title} className="flex flex-col items-center text-center gap-1">
          <Icon className="h-6 w-6 text-black" />
          <p className="text-[11px] font-bold text-black">{title}</p>
          <p className="text-[10px] text-[#717171]">{subtitle}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `OrderSummary.tsx`**

```tsx
'use client';

import { ArrowRight, Lock, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { computeSavings } from '../domain/cart';
import { useCart } from './CartProvider';
import TrustBadges from './TrustBadges';

export default function OrderSummary() {
  const { items, subtotal, count } = useCart();
  const router = useRouter();
  const savings = computeSavings(items);

  return (
    <aside className="border border-[#EEEEEE] bg-white p-6 space-y-5 lg:sticky lg:top-28" id="order-summary">
      <h2 className="text-2xl font-bold text-black">Order Summary</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-[#717171]">
          <span>Subtotal ({count} {count === 1 ? 'item' : 'items'})</span>
          <span className="text-black">{formatCurrency(subtotal)}</span>
        </div>
        {savings > 0 && (
          <div className="flex justify-between text-[#717171]">
            <span>You save</span>
            <span className="text-red-500">{formatCurrency(savings)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-baseline border-t border-[#EEEEEE] pt-4">
        <span className="text-base font-bold text-black">Total</span>
        <span className="text-2xl font-bold text-black">{formatCurrency(subtotal)}</span>
      </div>
      <p className="text-[11px] text-[#717171] -mt-3">Delivery fee and promo codes are applied at checkout.</p>

      <div className="flex items-center gap-3 bg-[#F9F9F9] border border-[#EEEEEE] p-4">
        <Truck className="h-6 w-6 text-black shrink-0" />
        <div>
          <p className="text-xs font-bold text-black">Cash on Delivery</p>
          <p className="text-[11px] text-[#717171]">Pay when you receive your order</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push('/checkout')}
        className="flex w-full items-center justify-center gap-2 bg-black py-4 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-[#333333] transition-colors"
        id="proceed-to-checkout-btn"
      >
        <Lock className="h-4 w-4" />
        <span>Proceed to Checkout</span>
        <ArrowRight className="h-4 w-4" />
      </button>

      <TrustBadges />
    </aside>
  );
}
```

- [ ] **Step 4: Create `CartPage.tsx`**

```tsx
'use client';

import { ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useCart } from './CartProvider';
import CartItemRow from './CartItemRow';
import OrderSummary from './OrderSummary';

export default function CartPage() {
  const { items, count } = useCart();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-black">Shopping Cart</h1>
          <p className="text-sm text-[#717171] mt-1">
            {count} {count === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>
        <Link
          href="/"
          className="hidden sm:flex items-center gap-2 border border-[#EEEEEE] px-4 py-2.5 text-sm font-medium text-black hover:bg-[#F5F5F5]"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 border border-[#EEEEEE]">
          <div className="flex h-16 w-16 items-center justify-center border border-[#EEEEEE] bg-[#F5F5F5] text-[#717171] mb-5">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-black">Your bag is empty</h2>
          <p className="text-sm text-[#717171] mt-1 mb-6">Add something you love to get started.</p>
          <Link
            href="/"
            className="bg-black px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-[#333333]"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
          <section className="border border-[#EEEEEE] bg-white px-4 sm:px-6">
            <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_110px_130px_100px_40px] sm:gap-4 py-4 border-b border-[#EEEEEE] text-xs text-[#717171]">
              <span>Product</span>
              <span>Price</span>
              <span>Quantity</span>
              <span>Total</span>
              <span />
            </div>
            {items.map((item) => (
              <CartItemRow
                key={`${item.product.id}-${item.selectedSize || 'nosize'}-${item.selectedVariant?.id || 'novariant'}`}
                item={item}
              />
            ))}
          </section>
          <OrderSummary />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create the route `src/app/cart/page.tsx`** (mirrors `src/app/checkout/page.tsx`)

```tsx
'use client';

import Navbar from '@/features/catalog/presentation/Navbar';
import CartPage from '@/features/cart/presentation/CartPage';

export default function CartRoute() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <CartPage />
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/cart/presentation src/app/cart
git commit -m "feat: add /cart page with item rows and order summary

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: You May Also Like row

**Files:**
- Create: `src/features/cart/presentation/CartRecommendations.tsx`
- Modify: `src/features/cart/presentation/CartPage.tsx`

**Interfaces:**
- Consumes: `getProducts()` from `@/features/catalog/application/getProducts`; `pickRecommendations` (Task 2); `useProductModal().open(product, list?)` from `@/features/product/presentation/ProductModalProvider`.
- Produces: default export `CartRecommendations()`.

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Product } from '@/shared/domain/types';
import { getProducts } from '@/features/catalog/application/getProducts';
import { useProductModal } from '@/features/product/presentation/ProductModalProvider';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { discountPercent } from '../domain/cart';
import { pickRecommendations } from '../domain/recommendations';
import { useCart } from './CartProvider';

export default function CartRecommendations() {
  const { items } = useCart();
  const { open } = useProductModal();
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    getProducts()
      .then((products) => {
        if (!cancelled) setAllProducts(products);
      })
      .catch(() => {
        // Recommendations are optional; the cart works without them.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recommendations = pickRecommendations(allProducts, items);
  if (recommendations.length === 0) return null;

  return (
    <section className="space-y-4" id="cart-recommendations">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-black">You May Also Like</h2>
        <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-black hover:underline">
          View All <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {recommendations.map((p) => {
          const percent = discountPercent(p);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => open(p, recommendations)}
              className="text-left space-y-2"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#F5F5F5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                {percent !== undefined && (
                  <span className="absolute top-2 left-2 bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    {percent}% off
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-black truncate">{p.name}</p>
              <p className="text-sm font-bold text-black">
                {formatCurrency(p.price)}
                {percent !== undefined && (
                  <span className="ml-2 text-xs font-normal text-[#717171] line-through">
                    {formatCurrency(p.originalPrice!)}
                  </span>
                )}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
```


- [ ] **Step 2: Mount it in `CartPage.tsx`**

Add `import CartRecommendations from './CartRecommendations';` and render `<CartRecommendations />` as the last child of the outer `<div className="mx-auto …">` (after the ternary), so it shows for both empty and filled carts.

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/cart/presentation
git commit -m "feat: add recommendations row to cart page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Replace the drawer

**Files:**
- Modify: `src/features/catalog/presentation/Navbar.tsx` (lines ~11, ~18, ~89, ~181)
- Modify: `src/app/layout.tsx` (lines 5, 24)
- Modify: `src/features/cart/presentation/CartProvider.tsx`
- Delete: `src/features/cart/presentation/CartDrawer.tsx`

- [ ] **Step 1: Navbar** — change

```ts
  const { count: cartCount, openCart } = useCart();
```
to `const { count: cartCount } = useCart();` and

```ts
  const onOpenCart = openCart;
```
to `const onOpenCart = () => router.push('/cart');`

- [ ] **Step 2: Layout** — remove the `import CartDrawer …` line and the `<CartDrawer />` element.

- [ ] **Step 3: Provider** — remove `isOpen`, `openCart`, `closeCart` from `CartContextValue`, remove `const [isOpen, setIsOpen] = useState(false);`, and remove the three corresponding entries in `value`. Keep the `useState` import (still used for `items`).

- [ ] **Step 4: Delete the drawer**

Run: `git rm src/features/cart/presentation/CartDrawer.tsx`

- [ ] **Step 5: Verify nothing references removed code**

Run: `grep -rnE "CartDrawer|openCart|closeCart" src; npm run lint; npm test`
Expected: grep prints nothing (ignore `isOpen` matches in the admin cropper); tsc clean; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: replace cart drawer with /cart page navigation

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Verify in the running app

- [ ] **Step 1:** Run `npm run build`. Expected: build succeeds and lists the `/cart` route.
- [ ] **Step 2:** Start the app (`npm run dev`), add 2–3 products (at least one discounted, one with several color variants), open `/cart` via the navbar cart icon (desktop) and the bottom-bar Cart button (mobile width).
- [ ] **Step 3:** Check against the mockup and spec:
  - Rows show image, color, size, thumbnails, price with strikethrough and "% OFF", stepper, line total, trash.
  - Clicking a different thumbnail changes the row's color and image; choosing a color already in the cart merges the two rows.
  - Stepper `+` disables at stock; `−` at 1 removes the line.
  - Summary: Subtotal equals the sum of line totals, "You save" equals the strikethrough savings, Total equals Subtotal. The `/checkout` page shows the same subtotal.
  - Recommendations exclude cart items and sold-out products; clicking a card opens the product modal.
  - Empty cart shows the empty state plus recommendations; layout is stacked on mobile.
- [ ] **Step 4:** Report anything that fails with the observed behavior; fix before finishing. Then use superpowers:finishing-a-development-branch.
