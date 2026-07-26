# PDP Card Stack & Auto-Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the PDP image panel as a shallow, swipeable card stack with peeking adjacent-product images and an "X of Y" position indicator, and make the modal's product list auto-fetch the next catalog page once PDP navigation is within 4 items of the end of the currently-known list.

**Architecture:** A new presentational `ProductImageStack` component owns the stack visuals + drag gesture and replaces the plain `<img>` block in `ProductDetailView`. `ProductModalProvider` (the only place that has a product list and prev/next navigation) derives the previous/next products and position label and feeds them in, and gains a small "pagination bridge" (`syncList`, `registerPagination`) so `CatalogGrid` can keep the modal's list and `hasMore`/`loadMore` in sync with the catalog's own infinite-scroll state. Two pure helper functions (swipe-direction resolution, load-more trigger) are extracted so they're unit-testable per this repo's existing `vitest` conventions (`src/**/*.test.ts`, `environment: 'node'`, no component/DOM test infra — see `vitest.config.ts`).

**Tech Stack:** Next.js 15 / React 19, `motion/react` (already a dependency, used elsewhere for `AnimatePresence`), Tailwind CSS, TypeScript, Vitest.

## Global Constraints

- This codebase's visual language uses sharp, square edges everywhere (`rounded-none` on every bordered element in `ProductDetailView.tsx`, `ProductCard.tsx`, etc.) — the stack must NOT use `border-radius`. Depth is conveyed via subtle scale/offset/shadow/opacity only, not rounded corners (the wallet-app reference used rounded corners, but that would clash with this app's established flat, sharp-edged aesthetic — this is an intentional deviation from the literal reference image, not an oversight).
- The standalone `/product?id=X` route (`src/app/product/page.tsx` → `ProductPageContent` → `ProductDetailView`) has no product list. All new `ProductDetailView` props must be optional and the component must render correctly (plain image, no stack/peek/drag/label) when they're absent.
- No new test infrastructure (no jsdom/@testing-library) — only extract and unit-test pure logic; verify React/UI wiring manually in the browser, consistent with how this repo already tests (`src/features/catalog/domain/filter.test.ts` etc. — pure domain functions only).
- `npm run lint` (which is `tsc --noEmit`) and `npm test` (which is `vitest run`) must both pass after every task.

---

## Task 1: Auto-load-more trigger helper

**Files:**
- Create: `src/features/product/domain/paginationTrigger.ts`
- Test: `src/features/product/domain/paginationTrigger.test.ts`

**Interfaces:**
- Produces: `shouldLoadMore(currentIndex: number, listLength: number, hasMore: boolean, lookahead?: number): boolean` and `export const AUTO_LOAD_LOOKAHEAD = 4`. Later tasks (Task 4) import and call this.

- [ ] **Step 1: Write the failing test**

Create `src/features/product/domain/paginationTrigger.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { shouldLoadMore, AUTO_LOAD_LOOKAHEAD } from './paginationTrigger';

describe('shouldLoadMore', () => {
  it('is false when there is no more to load', () => {
    expect(shouldLoadMore(9, 10, false)).toBe(false);
  });

  it('is false when there is no active index', () => {
    expect(shouldLoadMore(-1, 10, true)).toBe(false);
  });

  it('is false while comfortably before the lookahead window', () => {
    expect(shouldLoadMore(5, 10, true)).toBe(false);
  });

  it('is true once within the lookahead window of the end', () => {
    expect(shouldLoadMore(6, 10, true)).toBe(true);
  });

  it('is true at the very last index', () => {
    expect(shouldLoadMore(9, 10, true)).toBe(true);
  });

  it('respects a custom lookahead', () => {
    expect(shouldLoadMore(7, 10, true, 2)).toBe(false);
    expect(shouldLoadMore(8, 10, true, 2)).toBe(true);
  });

  it('exports the default lookahead as 4', () => {
    expect(AUTO_LOAD_LOOKAHEAD).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/product/domain/paginationTrigger.test.ts`
Expected: FAIL — `Cannot find module './paginationTrigger'`

- [ ] **Step 3: Write minimal implementation**

Create `src/features/product/domain/paginationTrigger.ts`:

```ts
export const AUTO_LOAD_LOOKAHEAD = 4;

export function shouldLoadMore(
  currentIndex: number,
  listLength: number,
  hasMore: boolean,
  lookahead: number = AUTO_LOAD_LOOKAHEAD
): boolean {
  if (!hasMore || currentIndex < 0) return false;
  return currentIndex >= listLength - lookahead;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/product/domain/paginationTrigger.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/product/domain/paginationTrigger.ts src/features/product/domain/paginationTrigger.test.ts
git commit -m "feat: add shouldLoadMore helper for PDP-driven catalog pagination"
```

---

## Task 2: Swipe-direction resolution helper

**Files:**
- Create: `src/features/product/domain/swipeThreshold.ts`
- Test: `src/features/product/domain/swipeThreshold.test.ts`

**Interfaces:**
- Produces: `resolveSwipeNavigation(offsetX: number, velocityX: number): 1 | -1 | null`, plus exported constants `SWIPE_DISTANCE_THRESHOLD = 80` and `SWIPE_VELOCITY_THRESHOLD = 500`. Later tasks (Task 3) import and call this from the drag-end handler.

- [ ] **Step 1: Write the failing test**

Create `src/features/product/domain/swipeThreshold.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveSwipeNavigation } from './swipeThreshold';

describe('resolveSwipeNavigation', () => {
  it('returns null for a small, slow drag', () => {
    expect(resolveSwipeNavigation(10, 5)).toBeNull();
  });

  it('returns 1 (next) for a left drag past the distance threshold', () => {
    expect(resolveSwipeNavigation(-90, 0)).toBe(1);
  });

  it('returns -1 (previous) for a right drag past the distance threshold', () => {
    expect(resolveSwipeNavigation(90, 0)).toBe(-1);
  });

  it('returns 1 (next) for a fast left flick under the distance threshold', () => {
    expect(resolveSwipeNavigation(-20, -600)).toBe(1);
  });

  it('returns -1 (previous) for a fast right flick under the distance threshold', () => {
    expect(resolveSwipeNavigation(20, 600)).toBe(-1);
  });

  it('is exactly-at-threshold inclusive', () => {
    expect(resolveSwipeNavigation(-80, 0)).toBe(1);
    expect(resolveSwipeNavigation(0, -500)).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/product/domain/swipeThreshold.test.ts`
Expected: FAIL — `Cannot find module './swipeThreshold'`

- [ ] **Step 3: Write minimal implementation**

Create `src/features/product/domain/swipeThreshold.ts`:

```ts
export const SWIPE_DISTANCE_THRESHOLD = 80;
export const SWIPE_VELOCITY_THRESHOLD = 500;

export function resolveSwipeNavigation(offsetX: number, velocityX: number): 1 | -1 | null {
  if (Math.abs(offsetX) >= SWIPE_DISTANCE_THRESHOLD) {
    return offsetX < 0 ? 1 : -1;
  }
  if (Math.abs(velocityX) >= SWIPE_VELOCITY_THRESHOLD) {
    return velocityX < 0 ? 1 : -1;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/product/domain/swipeThreshold.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/product/domain/swipeThreshold.ts src/features/product/domain/swipeThreshold.test.ts
git commit -m "feat: add resolveSwipeNavigation helper for PDP drag gestures"
```

---

## Task 3: `ProductImageStack` component, wired into `ProductDetailView`

**Files:**
- Create: `src/features/product/presentation/ProductImageStack.tsx`
- Modify: `src/features/product/presentation/ProductDetailView.tsx:1-19` (imports + props interface), `:66-80` (image side block)

**Interfaces:**
- Consumes: `resolveSwipeNavigation` from Task 2 (`src/features/product/domain/swipeThreshold.ts`).
- Produces: `ProductImageStack` component with props `{ image: string; alt: string; category: string; previousImage?: string; nextImage?: string; onNavigate?: (offset: 1 | -1) => void; positionLabel?: { index: number; total: number }; navKey: string }`. `ProductDetailView` gains optional props `previousProduct?: Product`, `nextProduct?: Product`, `onNavigate?: (offset: 1 | -1) => void`, `positionLabel?: { index: number; total: number }` — consumed by Task 4.

- [ ] **Step 1: Create the component**

Create `src/features/product/presentation/ProductImageStack.tsx`:

```tsx
'use client';

import { motion, AnimatePresence, type PanInfo } from 'motion/react';
import { resolveSwipeNavigation } from '../domain/swipeThreshold';

interface ProductImageStackProps {
  image: string;
  alt: string;
  category: string;
  previousImage?: string;
  nextImage?: string;
  onNavigate?: (offset: 1 | -1) => void;
  positionLabel?: { index: number; total: number };
  navKey: string;
}

export default function ProductImageStack({
  image,
  alt,
  category,
  previousImage,
  nextImage,
  onNavigate,
  positionLabel,
  navKey,
}: ProductImageStackProps) {
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!onNavigate) return;
    const direction = resolveSwipeNavigation(info.offset.x, info.velocity.x);
    if (direction) onNavigate(direction);
  };

  return (
    <div className="relative h-full w-full overflow-hidden" id="product-image-stack">
      {previousImage && (
        <img
          src={previousImage}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="absolute inset-y-3 left-0 w-full -translate-x-3 scale-95 object-cover opacity-50"
        />
      )}
      {nextImage && (
        <img
          src={nextImage}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="absolute inset-y-3 left-0 w-full translate-x-3 scale-95 object-cover opacity-50"
        />
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={navKey}
          className="absolute inset-2 border border-black/10 bg-[#F5F5F5] shadow-lg"
          drag={onNavigate ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.5}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.2 }}
        >
          <img src={image} alt={alt} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        </motion.div>
      </AnimatePresence>
      <span className="absolute top-4 left-4 z-10 bg-black px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white">
        {category}
      </span>
      {positionLabel && (
        <span className="absolute bottom-4 right-4 z-10 bg-white/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-black">
          {positionLabel.index} of {positionLabel.total}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `ProductDetailView`**

In `src/features/product/presentation/ProductDetailView.tsx`, add the import (after the existing `pixelViewContent` import at line 12):

```ts
import ProductImageStack from './ProductImageStack';
```

Replace the props interface (lines 14-17):

```ts
interface ProductDetailViewProps {
  product: Product;
  onClose?: () => void;
  previousProduct?: Product;
  nextProduct?: Product;
  onNavigate?: (offset: 1 | -1) => void;
  positionLabel?: { index: number; total: number };
}
```

Update the component signature (line 19) to destructure the new props:

```ts
export default function ProductDetailView({
  product,
  onClose: onCloseProp,
  previousProduct,
  nextProduct,
  onNavigate,
  positionLabel,
}: ProductDetailViewProps) {
```

Replace the "Image side" block (lines 66-80):

```tsx
      {/* Image side */}
      <div
        className="relative w-full aspect-square md:w-[45%] lg:w-[50%] bg-[#F5F5F5] shrink-0"
        id="modal-product-image-container"
      >
        <ProductImageStack
          image={selectedVariant?.image || product.image}
          alt={product.name}
          category={product.category}
          previousImage={previousProduct?.image}
          nextImage={nextProduct?.image}
          onNavigate={onNavigate}
          positionLabel={positionLabel}
          navKey={product.id}
        />
      </div>
```

- [ ] **Step 3: Typecheck**

Run: `npm run lint`
Expected: no TypeScript errors.

- [ ] **Step 4: Manual verification (standalone route, no regressions)**

Run: `npm run dev`, visit `http://localhost:3000/product?id=<any real product id from your catalog>`.
Expected: image renders as before (no visible stack/peek/drag, since no list context supplies `previousProduct`/`nextProduct`/`onNavigate`/`positionLabel` on this route), category badge still shows top-left, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/product/presentation/ProductImageStack.tsx src/features/product/presentation/ProductDetailView.tsx
git commit -m "feat: render PDP image as a stack, wire optional peek/swipe/position props"
```

---

## Task 4: `ProductModalProvider` — previous/next derivation, position label, pagination bridge

**Files:**
- Modify: `src/features/product/presentation/ProductModalProvider.tsx` (whole file restructured below)

**Interfaces:**
- Consumes: `shouldLoadMore` from Task 1 (`src/features/product/domain/paginationTrigger.ts`); `ProductDetailView`'s new props from Task 3.
- Produces: `ProductModalContextValue` gains `syncList(list: Product[]): void` and `registerPagination(hasMore: boolean, loadMore: () => void): void` — consumed by Task 5 (`CatalogGrid`).

- [ ] **Step 1: Add the pagination bridge and previous/next/positionLabel derivation**

Replace the full contents of `src/features/product/presentation/ProductModalProvider.tsx`:

```tsx
'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { PackageX, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '@/shared/domain/types';
import { getProductById } from '@/features/product/application/getProductById';
import { shouldLoadMore } from '@/features/product/domain/paginationTrigger';
import ProductDetailView from './ProductDetailView';
import Spinner from '@/shared/ui/Spinner';
import EmptyState from '@/shared/ui/EmptyState';

interface ProductModalContextValue {
  open: (product: Product, list?: Product[]) => void;
  close: () => void;
  syncList: (list: Product[]) => void;
  registerPagination: (hasMore: boolean, loadMore: () => void) => void;
}

const ProductModalContext = createContext<ProductModalContextValue | null>(null);

export function ProductModalProvider({ children }: { children: React.ReactNode }) {
  const [productId, setProductId] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [productList, setProductList] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pushedHistory, setPushedHistory] = useState(false);
  const paginationRef = useRef<{ hasMore: boolean; loadMore: () => void } | null>(null);

  const close = () => {
    if (pushedHistory) {
      window.history.back();
    } else {
      setProductId(null);
    }
    setProductList(null);
  };

  const open = (p: Product, list?: Product[]) => {
    window.history.pushState(null, '', `/product?id=${p.id}`);
    setPushedHistory(true);
    setProduct(p);
    setProductId(p.id);
    setProductList(list ?? null);
  };

  const syncList = useCallback((list: Product[]) => {
    setProductList((prev) => (prev ? list : prev));
  }, []);

  const registerPagination = useCallback((hasMore: boolean, loadMore: () => void) => {
    paginationRef.current = { hasMore, loadMore };
  }, []);

  const currentIndex = productList && productId ? productList.findIndex((p) => p.id === productId) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex !== -1 && productList !== null && currentIndex < productList.length - 1;
  const previousProduct = hasPrevious ? productList![currentIndex - 1] : undefined;
  const nextProduct = hasNext ? productList![currentIndex + 1] : undefined;
  const positionLabel =
    productList && currentIndex !== -1 ? { index: currentIndex + 1, total: productList.length } : undefined;

  const goToOffset = (offset: number) => {
    if (!productList || currentIndex === -1) return;
    const next = productList[currentIndex + offset];
    if (!next) return;
    window.history.replaceState(null, '', `/product?id=${next.id}`);
    setProduct(next);
    setProductId(next.id);
  };

  useEffect(() => {
    if (!productList || currentIndex === -1) return;
    const pagination = paginationRef.current;
    if (!pagination) return;
    if (shouldLoadMore(currentIndex, productList.length, pagination.hasMore)) {
      pagination.loadMore();
    }
  }, [currentIndex, productList]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const isProductUrl = window.location.pathname === '/product' && params.get('id');
      setPushedHistory(false);
      setProduct(null);
      setProductList(null);
      setProductId(isProductUrl ? params.get('id') : null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      return;
    }
    if (product && product.id === productId) return;
    setLoading(true);
    getProductById(productId).then((p) => {
      setProduct(p);
      setLoading(false);
    });
  }, [productId, product]);

  return (
    <ProductModalContext.Provider value={{ open, close, syncList, registerPagination }}>
      {children}
      {productId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
          {hasPrevious && (
            <button
              onClick={() => goToOffset(-1)}
              aria-label="Previous product"
              id="product-modal-prev-btn"
              className="fixed left-2 sm:left-6 top-1/2 -translate-y-1/2 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => goToOffset(1)}
              aria-label="Next product"
              id="product-modal-next-btn"
              className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
          <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-white overflow-y-auto overscroll-contain sm:overflow-hidden shadow-2xl">
            {loading ? (
              <div className="flex justify-center py-32">
                <Spinner />
              </div>
            ) : product ? (
              <ProductDetailView
                product={product}
                onClose={close}
                previousProduct={previousProduct}
                nextProduct={nextProduct}
                onNavigate={goToOffset}
                positionLabel={positionLabel}
              />
            ) : (
              <div className="p-8">
                <EmptyState
                  icon={PackageX}
                  title="Product not found"
                  description="This product may have been removed, or the link is invalid."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </ProductModalContext.Provider>
  );
}

export function useProductModal(): ProductModalContextValue {
  const ctx = useContext(ProductModalContext);
  if (!ctx) throw new Error('useProductModal must be used within ProductModalProvider');
  return ctx;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: errors about `syncList`/`registerPagination` not being provided by `CatalogGrid`'s consumption — none yet, since `CatalogGrid` only destructures `open` today (`const { open } = useProductModal();`), so adding fields to the context value is backward-compatible. Expected: PASS, no errors.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: PASS (all existing + Task 1/2 tests).

- [ ] **Step 4: Commit**

```bash
git add src/features/product/presentation/ProductModalProvider.tsx
git commit -m "feat: derive PDP previous/next/position and add pagination sync bridge"
```

---

## Task 5: Wire `CatalogGrid` to sync list and pagination state into the modal

**Files:**
- Modify: `src/features/catalog/presentation/CatalogGrid.tsx:12-25` (props interface), `:27-52` (component body)

**Interfaces:**
- Consumes: `syncList`, `registerPagination` from Task 4's `useProductModal()`.

- [ ] **Step 1: Add `hasMore` to the props interface**

In `src/features/catalog/presentation/CatalogGrid.tsx`, update `CatalogGridProps` (lines 12-25) by adding `hasMore: boolean;` after `resultsLoading: boolean;`:

```ts
export interface CatalogGridProps {
  visibleProducts: Product[];
  categories: string[];
  subcategories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (subcategory: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resultsLoading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
}
```

(`useCatalogProducts()` already returns `hasMore` today and `src/app/page.tsx` already spreads the whole `catalog` object into `<CatalogGrid {...catalog} />`, so `hasMore` is already reaching this component at runtime — this step only makes it visible to TypeScript.)

- [ ] **Step 2: Destructure `hasMore` and sync it + the list into the modal**

Update the component signature (lines 27-40) to destructure `hasMore`:

```tsx
export default function CatalogGrid({
  visibleProducts,
  categories,
  subcategories,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  searchQuery,
  setSearchQuery,
  resultsLoading,
  hasMore,
  loadingMore,
  loadMore,
}: CatalogGridProps) {
```

Update the `useProductModal()` destructure (line 42) and add two sync effects right after the existing `loadMoreRef` effect block (after line 65, before the `return (`):

```tsx
  const { open, syncList, registerPagination } = useProductModal();
```

```tsx
  useEffect(() => {
    syncList(visibleProducts);
  }, [visibleProducts, syncList]);

  useEffect(() => {
    registerPagination(hasMore, loadMore);
  }, [hasMore, loadMore, registerPagination]);
```

- [ ] **Step 3: Typecheck**

Run: `npm run lint`
Expected: PASS, no errors.

- [ ] **Step 4: Manual end-to-end verification**

Run: `npm run dev`, visit the storefront homepage.
1. Open any product from the grid — confirm the image panel shows the new stack (sharp-edged front card with a subtle bordered/shadowed look, thin peeking slivers on whichever sides have a neighboring product, category badge top-left, "X of Y" label bottom-right).
2. Drag the image left/right past a short distance (or flick it) — confirm it navigates to the next/previous product and the "X of Y" label updates.
3. Keep navigating forward with the chevron button or swipe until you approach the last few items of the initially-loaded batch (`PAGE_SIZE = 16` in `useCatalogProducts.ts`) — confirm (via Network tab or by continuing to swipe past index 16) that more products load in automatically and navigation continues without hitting a dead end.
4. Close the modal and confirm the grid behind it also shows the newly-loaded products (proving `pagedProducts` state, shared via the same `useCatalogProducts` hook, actually grew).
5. Re-visit `http://localhost:3000/product?id=<id>` directly (standalone route) — confirm it still renders a plain, non-stacked image with no console errors.

- [ ] **Step 5: Run full test suite**

Run: `npm test && npm run lint`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/catalog/presentation/CatalogGrid.tsx
git commit -m "feat: sync catalog pagination state into the PDP modal for auto-load-more"
```

---

## Self-Review Notes

- **Spec coverage:** Stack visuals + peek (Task 3), swipe navigation (Tasks 2-3), position label (Tasks 3-4), auto-pagination keyed to PDP index (Tasks 1, 4, 5), standalone-route non-regression (Task 3 step 4, Task 5 step 4.5) — all five spec goals map to a task.
- **Rounded corners deviation:** documented explicitly in Global Constraints so no implementer "fixes" it back to match the reference screenshot literally.
- **Type consistency check:** `onNavigate` is `(offset: 1 | -1) => void` in `ProductImageStack`/`ProductDetailView`; `ProductModalProvider` passes `goToOffset` (typed `(offset: number) => void`) into that slot — this is a valid, safe assignment in TypeScript (a function accepting the wider `number` is assignable where a function accepting the narrower `1 | -1` is expected), and matches how `goToOffset` is already called elsewhere in the same file with literal `-1`/`1`.
- **No placeholders:** every step has complete, concrete code — no "add error handling" or "TBD" steps.
