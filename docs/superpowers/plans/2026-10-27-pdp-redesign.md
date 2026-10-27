# Product Page Redesign (Part 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the product detail view (modal and standalone page) to the cream mockup layout using only existing data.

**Architecture:** `ProductDetailView` is rewritten around small presentational parts (`Accordion`, `RelatedProducts`) and a pure `getRelatedProducts` domain helper. The modal provider widens its container, moves prev/next into the view header, keys the view by product id and exposes `navigateTo` for related-product clicks.

**Tech Stack:** Next.js 15, React 19, Tailwind 4, motion, lucide-react, vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-27-pdp-redesign-design.md`. Branch `feat/pdp-redesign` (do not switch branches).
- Existing data only: no database, migration, admin, `CartProvider` or catalog-grid changes. No gallery, rating/review count, feature row, wishlist hearts, or delivery-time claims.
- Cream `#FAF9F6` surface, black primary actions, `#EEEEEE`/`#E4E1DA` borders; square corners on buttons/cards (swatch cards and chips square too).
- Keep existing behavior: swipe card stack, Meta Pixel `pixelViewContent`, size chart fetch, `addToCart(product, quantity, size, variant)`, close/navigation on add.
- Shipping fees must come from `src/features/checkout/domain/pricing.ts` constants (`CITY_CORPORATION_DELIVERY_FEE`, `DHAKA_SUBURBAN_DELIVERY_FEE`, `STANDARD_DELIVERY_FEE`), formatted with `formatCurrency`.
- Do not touch `docs/screens/` (untracked). Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Verify with `npm run lint` and `npm test` (check real exit codes) before every commit.

---

### Task 1: `getRelatedProducts` (domain, TDD)

**Files:**
- Create: `src/features/product/domain/related.ts`
- Test: `src/features/product/domain/related.test.ts`

**Interfaces:**
- Produces: `getRelatedProducts(candidates: Product[], currentId: string, limit: number): Product[]` — candidates in given order, excluding `currentId`, truncated to `limit`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { getRelatedProducts } from './related';
import type { Product } from '@/shared/domain/types';

const p = (id: string): Product => ({ id, name: id, description: '', price: 1, image: '', category: 'T-Shirts', rating: 5 });

describe('getRelatedProducts', () => {
  const list = ['a', 'b', 'c', 'd', 'e'].map(p);

  it('excludes the current product and keeps order', () => {
    expect(getRelatedProducts(list, 'b', 10).map((x) => x.id)).toEqual(['a', 'c', 'd', 'e']);
  });

  it('truncates to the limit', () => {
    expect(getRelatedProducts(list, 'a', 3).map((x) => x.id)).toEqual(['b', 'c', 'd']);
  });

  it('returns fewer than the limit when candidates run out', () => {
    expect(getRelatedProducts([p('a'), p('b')], 'a', 4).map((x) => x.id)).toEqual(['b']);
  });

  it('returns [] for empty input, a zero limit, or when only the current product exists', () => {
    expect(getRelatedProducts([], 'a', 4)).toEqual([]);
    expect(getRelatedProducts(list, 'a', 0)).toEqual([]);
    expect(getRelatedProducts([p('a')], 'a', 4)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/features/product/domain/related.test.ts`
Expected: FAIL (cannot resolve `./related`).

- [ ] **Step 3: Implement**

```ts
import type { Product } from '@/shared/domain/types';

export function getRelatedProducts(candidates: Product[], currentId: string, limit: number): Product[] {
  if (limit <= 0) return [];
  return candidates.filter((product) => product.id !== currentId).slice(0, limit);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/features/product/domain/related.test.ts && npm run lint`
Expected: 4 tests pass, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/product/domain/related.ts src/features/product/domain/related.test.ts
git commit -m "feat: add related products helper

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Presentational parts (Accordion, RelatedProducts, TrustStrip export)

**Files:**
- Create: `src/features/product/presentation/Accordion.tsx`
- Create: `src/features/product/application/useRelatedProducts.ts`
- Create: `src/features/product/presentation/RelatedProducts.tsx`
- Modify: `src/features/catalog/presentation/TrustStrip.tsx` (export the items)

**Interfaces:**
- Consumes: `getRelatedProducts` (Task 1); `fetchProductsPage(pageSize, category, subcategory, cursor)` from `@/features/catalog/infrastructure/firestoreProductsRepository`; `formatCurrency`.
- Produces:
  - `TRUST_ITEMS: { icon: LucideIcon; title: string; subtitle: string }[]` exported from `TrustStrip.tsx` (TrustStrip itself unchanged in output).
  - `Accordion` default export, props `{ sections: { id: string; title: string; content: React.ReactNode }[]; openId: string | null; onToggle: (id: string) => void }`.
  - `useRelatedProducts(product: Product): { related: Product[]; loading: boolean }`.
  - `RelatedProducts` default export, props `{ product: Product; onSelect: (p: Product) => void }`.

- [ ] **Step 1: TrustStrip** — rename the local `ITEMS` constant to an exported `TRUST_ITEMS` and use it in the component; no markup changes.

- [ ] **Step 2: Accordion**

```tsx
'use client';

import { Plus, Minus } from 'lucide-react';

interface AccordionProps {
  sections: { id: string; title: string; content: React.ReactNode }[];
  openId: string | null;
  onToggle: (id: string) => void;
}

export default function Accordion({ sections, openId, onToggle }: AccordionProps) {
  return (
    <div className="border-t border-[#E4E1DA]" id="product-accordions">
      {sections.map((section) => {
        const open = openId === section.id;
        return (
          <div key={section.id} id={`accordion-${section.id}`} className="border-b border-[#E4E1DA]">
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`accordion-panel-${section.id}`}
                onClick={() => onToggle(section.id)}
                className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold text-black"
              >
                {section.title}
                {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            </h3>
            {open && (
              <div id={`accordion-panel-${section.id}`} className="pb-5 text-sm leading-relaxed text-[#4A4A4A]">
                {section.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Hook**

```ts
'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/shared/domain/types';
import { fetchProductsPage } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import { getRelatedProducts } from '../domain/related';

const RELATED_LIMIT = 4;

// Fetches one extra so the current product can be filtered out. A failure
// just means no related section — it must never break the product page.
export function useRelatedProducts(product: Product): { related: Product[]; loading: boolean } {
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProductsPage(RELATED_LIMIT + 1, product.category, undefined, null)
      .then((page) => {
        if (!cancelled) setRelated(getRelatedProducts(page.products, product.id, RELATED_LIMIT));
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id, product.category]);

  return { related, loading };
}
```

- [ ] **Step 4: RelatedProducts**

```tsx
'use client';

import type { Product } from '@/shared/domain/types';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { useRelatedProducts } from '../application/useRelatedProducts';

interface RelatedProductsProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export default function RelatedProducts({ product, onSelect }: RelatedProductsProps) {
  const { related, loading } = useRelatedProducts(product);
  if (loading || related.length === 0) return null;

  return (
    <section className="mt-10" id="related-products">
      <h2 className="mb-4 text-lg font-bold text-black">You May Also Like</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {related.map((item) => {
          const hasDiscount = !!(item.originalPrice && item.originalPrice > item.price);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="group text-left"
              aria-label={item.name}
            >
              <div className="aspect-[4/5] overflow-hidden bg-[#F5F5F5]">
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <p className="mt-2 line-clamp-1 text-sm text-black">{item.name}</p>
              <p className="mt-0.5 flex items-baseline gap-2">
                <span className="text-sm font-bold text-black">{formatCurrency(item.price)}</span>
                {hasDiscount && (
                  <span className="font-mono text-[11px] text-[#919191] line-through">
                    {formatCurrency(item.originalPrice!)}
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

- [ ] **Step 5: Verify and commit**

Run: `npm run lint && npm test` (expected clean, tests pass).

```bash
git add src/features/product src/features/catalog/presentation/TrustStrip.tsx
git commit -m "feat: add accordion and related products for product page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Rewrite `ProductDetailView` (and image stack badge)

**Files:**
- Modify: `src/features/product/presentation/ProductDetailView.tsx` (full rewrite of the markup; keep logic noted below)
- Modify: `src/features/product/presentation/ProductImageStack.tsx` (optional `discountPercent` badge, top-right)

**Interfaces:**
- Consumes: `Accordion`, `RelatedProducts`, `TRUST_ITEMS`, `getDefaultSize` (`@/features/catalog/domain/sizes`), pricing constants, existing helpers/imports already used by the file.
- Produces: `ProductDetailView` props = existing props plus `onSelectRelated?: (product: Product) => void`.

Keep from the current file: the `useEffect`s for `pixelViewContent` and size-chart loading; `handleAddToCart` (add, reset quantity, `onClose()`); `resolveAvailableStock`/`isProductOutOfStock` usage; the `useRouter`/`onClose` default (`router.push('/')`); the `ProductImageStack` props (`image` = selected variant image or product image, previous/next images, `onNavigate`, `positionLabel`, `navKey`).

State: `selectedVariant` (init first variant), `selectedSize` (init `getDefaultSize(product) ?? ''`), `quantity` (1), `openSection` (`'description'` closed by default → `null`).

Layout (all inside `#product-detail-view`, background `#FAF9F6`):
1. **Header row** (`flex items-center justify-between px-4 sm:px-6 py-4`): left `<button>` "← Back to Shop" (`ArrowLeft` icon) calling `onClose` (keep `id="product-modal-close"`); right, only when `positionLabel` exists: prev `<button aria-label="Previous product" id="product-modal-prev-btn">` (`ChevronLeft`, disabled when no `previousProduct`), text `{index} of {total}`, next button (`aria-label="Next product" id="product-modal-next-btn"`, `ChevronRight`, disabled when no `nextProduct`), calling `onNavigate?.(-1 | 1)`.
2. **Two-column grid** (`grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-8 px-4 sm:px-6 pb-8`):
   - **Left**: `flex gap-3`. Thumbnail rail (only when `variants.length > 1`): vertical column on `md+` (`hidden md:flex flex-col gap-3 w-20 max-h-[560px] overflow-y-auto`), each a square button with the variant image, selected = `border-2 border-black`, else `border border-[#E4E1DA]`, `aria-label={variant.name}`, click sets `selectedVariant`. The image container `relative flex-1 aspect-[4/5] bg-[#F5F5F5]` holds `ProductImageStack` (pass `discountPercent`). On mobile the same thumbnails render as a horizontal row below the image (`md:hidden flex gap-2 mt-3 overflow-x-auto`).
   - **Right**: `space-y-5`:
     - `<h1>` title (`text-3xl font-bold text-black`, sentence case, not uppercase).
     - Price row: current price `text-3xl font-bold`, struck-through original, red `N% OFF` badge (same discount rule as the card), and a `Cash on Delivery Eligible` chip (small bordered pill with `Truck` icon, pushed right on `sm+`).
     - Short description: `line-clamp-2 text-sm text-[#4A4A4A]`.
     - Divider, then **Color / Design** (only when variants exist): label row "Color / Design" on the left and `selectedVariant.name` on the right; below, square swatch cards (`h-16 w-16`) showing the variant image (fallback: `colorCode` fill), selected `border-2 border-black`, else `border border-[#E4E1DA]`.
     - **Size** (only when `parentProduct.sizeOrder.length > 0`): label row "Size" with, on the right when `sizeChart` exists, a "Size Guide" underlined button (`Ruler` icon) that sets `openSection` to `'size-chart'` and scrolls `#accordion-size-chart` into view (`scrollIntoView({ behavior: 'smooth', block: 'center' })` after a `requestAnimationFrame`). Chips `min-w-[56px] h-12 text-sm font-semibold`, selected black/white, out-of-stock `line-through` disabled with a muted background. Selecting a size resets `quantity` to 1.
     - **Availability box** (`bg-[#E9F0E4] border border-[#D5E3CC]` with `CheckCircle` when in stock; neutral gray box otherwise): "In Stock (N left)" when `availableStock > 0`; "Select a size to see availability" when no size; "Temporarily Out of Stock" when stock 0; "Unavailable" when no `parentProduct`. Keep the existing branching logic.
     - **Quantity + Add to Cart** (only when `parentProduct`): a "Quantity" label above a stepper (`− qty +`, max = available stock, min 1, ids `modal-qty-minus` / `modal-qty-plus`), beside a full-width black button (id `modal-add-to-cart-action`) with `ShoppingBag` icon and the existing label rules (`Select a Size` / `Out of Stock` / `Add to Cart (<variant> – <size>) – ৳<total>`).
     - **Trust row**: three columns from `TRUST_ITEMS` (icon, title, subtitle), `border-y border-[#E4E1DA] py-4`.
     - **Accordions** (`Accordion`): `description` → full `product.description` (preserve line breaks with `whitespace-pre-line`); `size-chart` → the existing size chart table markup (only included when `sizeChart` exists; remove the old expanding panel and `showSizeChart` state); `shipping` → a short paragraph "Cash on delivery is available all over Bangladesh. Pay when you receive your order." plus a 3-row list of fees: city corporations (Dhaka North & South) `CITY_CORPORATION_DELIVERY_FEE`, Dhaka suburban areas `DHAKA_SUBURBAN_DELIVERY_FEE`, everywhere else `STANDARD_DELIVERY_FEE`, via `formatCurrency`. `onToggle` toggles `openSection` (same id closes).
3. **Related**: below the grid, inside `px-4 sm:px-6 pb-10`: `<RelatedProducts product={product} onSelect={onSelectRelated ?? ((p) => router.push(`/product?id=${p.id}`))} />`.

`ProductImageStack`: add optional prop `discountPercent?: number`; when > 0 render a red badge (`absolute top-4 right-4 z-10 bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white`, text `{n}% OFF`) next to the existing category badge/position label.

- [ ] **Step 1:** Read both files in full, then implement as above.
- [ ] **Step 2:** `npm run lint && npm test` — clean/passing (no unused imports or state left over).
- [ ] **Step 3: Commit**

```bash
git add src/features/product/presentation/ProductDetailView.tsx src/features/product/presentation/ProductImageStack.tsx
git commit -m "feat: redesign product detail view

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Modal provider and standalone page

**Files:**
- Modify: `src/features/product/presentation/ProductModalProvider.tsx`
- Modify: `src/app/product/page.tsx`

**Interfaces:**
- Consumes: `ProductDetailView` with new `onSelectRelated` prop (Task 3).
- Produces: context value gains `navigateTo(product)`? No — keep the public context API unchanged; `navigateTo` is internal to the provider and passed to the view as `onSelectRelated`.

- [ ] **Step 1: Provider edits**
  - Remove the two external edge chevron buttons (`product-modal-prev-btn` / `product-modal-next-btn` blocks) and the now-unused `ChevronLeft`/`ChevronRight` imports; the view header owns navigation now. Keep `goToOffset`, `hasPrevious`, `hasNext`.
  - Widen the content container from `sm:max-w-4xl` to `sm:max-w-6xl`, keep `bg-[#FAF9F6]`, and make the scroll container scroll vertically on all sizes: `overflow-y-auto overscroll-contain` (replace `sm:overflow-hidden`).
  - Add a `scrollRef` on that container and an effect that calls `scrollRef.current?.scrollTo({ top: 0 })` whenever `productId` changes.
  - Render `<ProductDetailView key={product.id} … onSelectRelated={navigateTo} />`.
  - Add `navigateTo = (next: Product) => { window.history.replaceState(null, '', `/product?id=${next.id}`); setProduct(next); setProductId(next.id); }` (keeps the list context; if the target isn't in the list, `currentIndex` becomes -1 and the header position/arrows disappear — acceptable).
- [ ] **Step 2: Standalone page**: change `max-w-4xl` to `max-w-6xl` and drop the horizontal padding on `<main>` to `px-0 sm:px-6 lg:px-8`; page background `bg-[#FAF9F6]`.
- [ ] **Step 3:** `npm run lint && npm test` — clean/passing.
- [ ] **Step 4: Commit**

```bash
git add src/features/product/presentation/ProductModalProvider.tsx src/app/product/page.tsx
git commit -m "feat: widen product modal, move navigation to header, reset on product change

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Verification (user-assisted)

- [ ] Run `npm run dev` (Supabase env already in `.env.local`). Check at desktop (≥1280px) and mobile (390px): open a product from the grid; header Back/prev/next/`N of M`; swipe on the image; thumbnail rail and swatch selection both change the image; size chips (first in-stock preselected, out-of-stock disabled); Size Guide opens the accordion; Add to Cart label and behavior; accordions toggle; Shipping fees match checkout; "You May Also Like" shows four cards and a click swaps the product without closing the modal and scrolls to top; `/product?id=<id>` standalone page shows the same layout with only Back to Shop.
- [ ] Report deviations from the mockup rather than silently fixing them.
