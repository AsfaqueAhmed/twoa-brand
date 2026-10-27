# Home Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the home page (cream theme, trust strip, pill filters) and give product cards selectable color/size with direct Add to Cart.

**Architecture:** Frontend-only change inside `src/features/catalog`. A tiny pure domain helper (`sizes.ts`) drives default-size logic and is unit-tested; `ProductCard` consumes it; `TrustStrip` is a new standalone section component; `CatalogGrid` loses the hero and search input.

**Tech Stack:** Next.js 15, React 19, Tailwind 4, motion, lucide-react, vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-26-home-redesign-design.md`. Branch `feat/home-redesign`.
- No hero section and no search input on the home page. Do not touch search state in `useCatalogProducts`.
- No backend, migration, admin, or `CartProvider` changes. `addToCart(product, quantity, selectedSize, selectedVariant)` already exists.
- Cream `#FAF9F6` page background, black primary actions, `#EEEEEE` borders, square corners on cards/buttons, pills for filters only.
- Do not change checkout, orders, admin or product-modal styling. The Navbar already uses `/branding/logo-wordmark.png` and a cart badge (correction to the spec: only its background changes).
- Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

---

### Task 1: Size helpers (domain, TDD)

**Files:**
- Create: `src/features/catalog/domain/sizes.ts`
- Test: `src/features/catalog/domain/sizes.test.ts`

**Interfaces:**
- Produces: `getInStockSizes(product: Product): string[]` (sizes in `parentProduct.sizeOrder` order with stock > 0, `[]` if no parent product) and `getDefaultSize(product: Product): string | undefined` (first in-stock size).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { getInStockSizes, getDefaultSize } from './sizes';
import type { Product } from '@/shared/domain/types';

const base: Product = { id: '1', name: 'Tee', description: '', price: 10, image: '', category: 'T-Shirts', rating: 5 };

const withStock = (stockBySize: Record<string, number>): Product => ({
  ...base,
  parentProduct: { id: 'p', name: 'Tee', sizeOrder: Object.keys(stockBySize), stockBySize },
});

describe('catalog size helpers', () => {
  it('returns in-stock sizes in canonical order', () => {
    expect(getInStockSizes(withStock({ S: 0, M: 3, L: 1, XL: 0 }))).toEqual(['M', 'L']);
  });

  it('returns [] when there is no parent product', () => {
    expect(getInStockSizes(base)).toEqual([]);
  });

  it('default size is the first in-stock size', () => {
    expect(getDefaultSize(withStock({ S: 0, M: 3, L: 1 }))).toBe('M');
  });

  it('default size is undefined when nothing is in stock or no parent product', () => {
    expect(getDefaultSize(withStock({ S: 0, M: 0 }))).toBeUndefined();
    expect(getDefaultSize(base)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/catalog/domain/sizes.test.ts`
Expected: FAIL (cannot resolve `./sizes`).

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Product } from '@/shared/domain/types';

export function getInStockSizes(product: Product): string[] {
  const parent = product.parentProduct;
  if (!parent) return [];
  return parent.sizeOrder.filter((size) => (parent.stockBySize[size] ?? 0) > 0);
}

export function getDefaultSize(product: Product): string | undefined {
  return getInStockSizes(product)[0];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/catalog/domain/sizes.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog/domain/sizes.ts src/features/catalog/domain/sizes.test.ts
git commit -m "feat: add catalog size helpers

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Redesigned product card with selectable color/size

**Files:**
- Modify: `src/features/catalog/presentation/ProductCard.tsx` (full rewrite)
- Modify: `src/features/catalog/presentation/CatalogGrid.tsx:170-180` (the `onAddToCart` handler)

**Interfaces:**
- Consumes: `getInStockSizes`, `getDefaultSize` from `../domain/sizes`.
- Produces: `ProductCard` prop `onAddToCart: (product: Product, size: string | undefined, variant: ProductVariant | undefined, e: React.MouseEvent) => void`. The grid passes it straight to `useCart().addToCart(product, 1, size, variant)`.

- [ ] **Step 1: Rewrite ProductCard**

Replace the whole file with:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import type { Product, ProductVariant } from '@/shared/domain/types';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { isProductOutOfStock } from '@/shared/domain/stock';
import { getDefaultSize, getInStockSizes } from '../domain/sizes';

interface ProductCardProps {
  key?: string;
  product: Product;
  onSelect: (product: Product) => void;
  onAddToCart: (
    product: Product,
    size: string | undefined,
    variant: ProductVariant | undefined,
    e: React.MouseEvent
  ) => void;
}

export default function ProductCard({ product, onSelect, onAddToCart }: ProductCardProps) {
  const hasDiscount = !!(product.originalPrice && product.originalPrice > product.price);
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;
  const outOfStock = isProductOutOfStock(product);

  const variants = product.variants ?? [];
  const hasVariants = variants.length > 0;
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [userPickedVariant, setUserPickedVariant] = useState(false);

  const inStockSizes = getInStockSizes(product);
  const [pickedSize, setPickedSize] = useState<string | undefined>(() => getDefaultSize(product));
  // Fall back to the default if the picked size went out of stock after a refresh.
  const selectedSize = pickedSize && inStockSizes.includes(pickedSize) ? pickedSize : getDefaultSize(product);

  // Auto-rotate variant images every 3.5s until hovered or the shopper picks one.
  useEffect(() => {
    if (!hasVariants || isHovered || userPickedVariant) return;
    const timer = setInterval(() => {
      setActiveVariantIndex((i) => (i + 1) % variants.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [hasVariants, isHovered, userPickedVariant, variants.length]);

  const activeVariant: ProductVariant | undefined = hasVariants ? variants[activeVariantIndex] : undefined;
  const displayedImage = activeVariant?.image || product.image;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex flex-col overflow-hidden rounded-none bg-white cursor-pointer"
      onClick={() => onSelect(product)}
      id={`product-card-${product.id}`}
    >
      {/* Product Image */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[#F5F5F5]">
        <img
          src={displayedImage}
          alt={product.name}
          className="h-full w-full object-cover object-center transition-all duration-500 group-hover:scale-103"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <span className="absolute top-3 left-3 bg-black/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white">
          {product.category}
        </span>

        {hasDiscount && !outOfStock && (
          <span className="absolute top-3 right-3 bg-red-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white font-mono">
            {discountPercent}% OFF
          </span>
        )}

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-xs">
            <span className="bg-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Out of stock
            </span>
          </div>
        )}

        {hasVariants && (
          <div
            className="absolute bottom-3 left-3 flex items-center gap-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {variants.map((v, idx) => {
              const isActive = activeVariantIndex === idx;
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-label={v.name}
                  aria-pressed={isActive}
                  title={v.name}
                  className={`relative h-8 w-8 p-[1.5px] bg-white overflow-hidden transition-all duration-200 ${
                    isActive
                      ? 'border-2 border-black scale-105 shadow-sm'
                      : 'border border-black/10 hover:border-black/30'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveVariantIndex(idx);
                    setUserPickedVariant(true);
                  }}
                  onMouseEnter={() => setActiveVariantIndex(idx)}
                >
                  <img
                    src={v.image || product.image}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col pt-3 pb-1">
        <h3 className="text-[14px] font-bold text-black line-clamp-1">{product.name}</h3>
        <p className="mt-1 text-xs text-[#717171] line-clamp-2 leading-relaxed">{product.description}</p>

        {activeVariant && (
          <div className="mt-2.5 flex items-center gap-2 text-xs text-[#717171]">
            {activeVariant.colorCode && (
              <span
                className="h-3 w-3 rounded-full border border-black/10 shrink-0"
                style={{ backgroundColor: activeVariant.colorCode }}
              />
            )}
            <span className="truncate">{activeVariant.name}</span>
          </div>
        )}

        {inStockSizes.length > 0 && (
          <div
            className="mt-2.5 flex flex-wrap items-center gap-1.5"
            id={`product-card-sizes-${product.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            {inStockSizes.map((sz) => (
              <button
                key={sz}
                type="button"
                aria-pressed={selectedSize === sz}
                onClick={(e) => {
                  e.stopPropagation();
                  setPickedSize(sz);
                }}
                className={`inline-flex h-6 min-w-[28px] px-2 items-center justify-center text-[10px] font-bold font-mono transition-colors ${
                  selectedSize === sz
                    ? 'bg-[#4A4A4A] text-white'
                    : 'bg-[#F0EEE9] text-black hover:bg-[#E4E1DA]'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[16px] font-bold text-black leading-tight">{formatCurrency(product.price)}</span>
          {hasDiscount && product.originalPrice !== undefined && (
            <span className="text-[11px] text-[#919191] line-through font-semibold font-mono">
              {formatCurrency(product.originalPrice)}
            </span>
          )}
        </div>

        <button
          id={`add-to-cart-btn-${product.id}`}
          disabled={outOfStock}
          onClick={(e) => onAddToCart(product, selectedSize, activeVariant, e)}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 bg-black text-white text-[11px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[#333333] disabled:cursor-not-allowed disabled:bg-[#E4E1DA] disabled:text-[#A1A1A1]"
        >
          <ShoppingBag className="h-4 w-4" />
          Add to Cart
        </button>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Update the grid's add-to-cart handler**

In `CatalogGrid.tsx`, replace the `onAddToCart={(p, e) => { ... }}` block (lines ~170-180) with:

```tsx
                onAddToCart={(p, size, variant, e) => {
                  e.stopPropagation();
                  addToCart(p, 1, size, variant);
                }}
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/catalog/presentation/ProductCard.tsx src/features/catalog/presentation/CatalogGrid.tsx
git commit -m "feat: selectable color/size and direct add-to-cart on product cards

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Skeleton matches the new card

**Files:**
- Modify: `src/features/catalog/presentation/ProductCardSkeleton.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// Placeholder matching ProductCard's layout (image aspect ratio, text block
// heights, size chips, price, full-width button) so the grid doesn't jump
// when real cards swap in.
export default function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-none bg-white">
      <div className="aspect-[4/5] bg-[#EEEEEE] shimmer" />

      <div className="flex flex-1 flex-col pt-3 pb-1">
        <div className="h-4 w-3/4 bg-[#EEEEEE] shimmer" />
        <div className="mt-2.5 h-3 w-full bg-[#EEEEEE] shimmer" />
        <div className="mt-1.5 h-3 w-2/3 bg-[#EEEEEE] shimmer" />
        <div className="mt-3 h-3 w-1/3 bg-[#EEEEEE] shimmer" />
        <div className="mt-2.5 flex gap-1.5">
          <div className="h-6 w-8 bg-[#EEEEEE] shimmer" />
          <div className="h-6 w-8 bg-[#EEEEEE] shimmer" />
          <div className="h-6 w-8 bg-[#EEEEEE] shimmer" />
        </div>
        <div className="mt-3 h-5 w-20 bg-[#EEEEEE] shimmer" />
        <div className="mt-3 h-10 w-full bg-[#EEEEEE] shimmer" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/catalog/presentation/ProductCardSkeleton.tsx
git commit -m "feat: update product card skeleton to new card layout

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Trust strip, pill filters, cream theme

**Files:**
- Create: `src/features/catalog/presentation/TrustStrip.tsx`
- Modify: `src/features/catalog/presentation/CatalogGrid.tsx` (remove hero + search, restyle filters, drop unused props/imports)
- Modify: `src/app/page.tsx`
- Modify: `src/features/catalog/presentation/Navbar.tsx:22` (header background)

**Interfaces:**
- Produces: `TrustStrip` default export, no props.
- `CatalogGridProps` keeps `searchQuery`/`setSearchQuery` so the `{...catalog}` spread in `page.tsx` still type-checks, but the component no longer destructures or renders them.

- [ ] **Step 1: Create TrustStrip**

```tsx
import { Truck, ShieldCheck, Package } from 'lucide-react';

const ITEMS = [
  { icon: Truck, title: 'Cash on Delivery', subtitle: 'Pay when you receive' },
  { icon: ShieldCheck, title: '100% Risk-Free', subtitle: 'Shop with confidence' },
  { icon: Package, title: 'Nationwide Delivery', subtitle: 'All over Bangladesh' },
];

export default function TrustStrip() {
  return (
    <section className="border-b border-[#EEEEEE] bg-[#FAF9F6]" id="trust-strip">
      <div className="mx-auto grid max-w-7xl grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 px-4 sm:px-6 lg:px-8 py-5 sm:divide-x sm:divide-[#E4E1DA]">
        {ITEMS.map(({ icon: Icon, title, subtitle }) => (
          <div key={title} className="flex items-center justify-center gap-3">
            <Icon className="h-7 w-7 text-black" strokeWidth={1.25} />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-black">{title}</p>
              <p className="text-xs text-[#717171]">{subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Edit CatalogGrid**

1. Imports: change `import { Search, Sparkles } from 'lucide-react';` to `import { Search } from 'lucide-react';` (still used by `EmptyState`).
2. Remove `searchQuery,` and `setSearchQuery,` from the destructured parameters (keep them in the interface).
3. Remove `const { open, syncList, registerPagination }` is unchanged; no edit.
4. Delete the hero `<div className="relative overflow-hidden ... bg-black ...">…</div>` block entirely.
5. Replace the search + category `<div className="flex flex-col md:flex-row ...">…</div>` block with:

```tsx
      <div className="mb-4 flex items-center gap-3 overflow-x-auto pb-1" id="category-selector">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 rounded-full px-6 py-2.5 text-xs font-bold tracking-wide transition-all duration-200 border ${
              selectedCategory === cat
                ? 'bg-black text-white border-black'
                : 'bg-white border-[#E4E1DA] text-black hover:border-black'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
```

6. Replace the subcategory block with (no "Subcategories:" label, pills inside a soft bar):

```tsx
      {selectedCategory !== 'All' && subcategories.length > 1 && (
        <div
          className="mb-8 flex items-center gap-2 overflow-x-auto rounded-full bg-[#F0EEE9] p-1.5 animate-in fade-in duration-200"
          id="subcategory-selector"
        >
          {subcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubcategory(sub)}
              className={`shrink-0 rounded-full px-5 py-2 text-xs font-semibold transition-all duration-200 ${
                selectedSubcategory === sub ? 'bg-black text-white' : 'text-[#4A4A4A] hover:text-black'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}
```

7. Change the outer wrapper's `pt-8` to `pt-6`, and add `mb-8` to nothing else. Grid wrapper classes stay.

- [ ] **Step 3: Edit page.tsx**

Add `import TrustStrip from '@/features/catalog/presentation/TrustStrip';`, change the root div class `bg-white` to `bg-[#FAF9F6]`, and render `<TrustStrip />` as the first child of `<main>` (before the loading ternary). In the loading branch change `pt-8` to `pt-6`.

- [ ] **Step 4: Navbar background**

At `Navbar.tsx:22` change `bg-white/95` to `bg-[#FAF9F6]/95` in the `<header>` className. Leave the mobile bottom nav as is.

- [ ] **Step 5: Type-check and test**

Run: `npm run lint && npm test`
Expected: tsc clean, all vitest suites pass.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: cream home page with trust strip and pill filters

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Visual and behavior verification

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (port 3000).

- [ ] **Step 2: Walk through the page at 1440px and 390px widths**

Check each: cream background and cream navbar with the wordmark logo; trust strip (3 columns desktop, stacked mobile); no hero, no search box; category pills filter products; subcategory pill bar appears for a non-All category; loading skeleton matches card height; card shows variant thumbnails, color name, size chips (first in-stock preselected), price, full-width Add to Cart.

- [ ] **Step 3: Behavior checks**

- Click a size chip then Add to Cart: cart badge increments, cart drawer line shows chosen size and variant.
- Click a variant thumbnail: image and color name change and auto-rotation stops for that card.
- Click the card body or image: product modal opens. Clicking a chip or thumbnail does not open it.
- An out-of-stock product shows the overlay and a disabled button.

- [ ] **Step 4: Final checks and report**

Run: `npm run lint && npm test`
Expected: both pass. Report anything that deviates from the mockup instead of fixing it silently.
