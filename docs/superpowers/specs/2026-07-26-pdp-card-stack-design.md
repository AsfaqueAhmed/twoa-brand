# PDP Card Stack & Auto-Pagination Design

## Context

The product detail page (PDP) is shown two ways in this app:

1. **Modal, from a list** (`ProductModalProvider.tsx`) — opened by clicking a `ProductCard` in `CatalogGrid.tsx`. It already supports prev/next chevron navigation across the list that was active when the modal opened (`currentIndex`, `hasPrevious`, `hasNext`, `goToOffset`).
2. **Standalone route** (`src/app/product/page.tsx`) — a deep link `/product?id=X` with no surrounding list, no prev/next.

The catalog list (`useCatalogProducts.ts`) is paginated with Firestore cursor-based infinite scroll: `pagedProducts` grows via `loadMore()` as the user scrolls the grid (`PAGE_SIZE = 16`), triggered by an `IntersectionObserver` on a sentinel in `CatalogGrid.tsx`.

Two related gaps prompted this design:

- The PDP's image panel is a plain static image. The user wants it to look and feel like a stack of cards (reference: a wallet-app card carousel with peeking card edges behind the front card, and a mobile onboarding modal for visual flavor only — not literally onboarding-related).
- The modal's `productList` is a one-time snapshot taken at `open()` time. It never grows even though the underlying catalog keeps paginating in the background, so a user browsing forward through the PDP can run out of "next" products well before the catalog actually runs out. Pagination should keep pace with PDP navigation, loading the next catalog page once the user is within 4 items of the end of the currently-known list.

## Goals

1. Restyle the PDP image panel as a shallow card stack: current product's image up front (rounded corners, shadow, slightly inset), with a single thin sliver of the previous/next product's image peeking from behind on each side.
2. Support swipe/drag-to-navigate on the image (in addition to the existing chevron buttons), moving to the prev/next product in the active list.
3. Show a lightweight "X of Y" position indicator instead of per-item dots (impractical for lists with dozens of products).
4. Auto-fetch the next catalog page while browsing the PDP, once the current index is within 4 items of the end of the known list — mirroring the grid's own infinite scroll, but keyed to PDP navigation instead of scroll position.
5. None of this should affect the standalone `/product?id=` route, which has no list context — it keeps rendering a plain image with no stack, swipe, or position indicator.

## Non-goals

- No changes to the catalog grid's own visual layout or its infinite-scroll behavior.
- No swipe/drag support added to the standalone `/product?id=` route (no list = nothing to navigate to).
- No backward auto-pagination (loading earlier pages) — the catalog only ever loads forward, same as today.
- No change to search behavior — `hasMore` is already forced `false` while searching (`useCatalogProducts.ts`), so auto-pagination never fires there, which is correct since the search list is already the full result set.

## Design

### 1. Stacked-card image panel with swipe navigation

**`ProductDetailView.tsx` new optional props:**

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

All four new props are optional. When absent (standalone route), the image panel renders exactly as it does today — no stack, no drag, no label.

**Visual structure of the image panel, when list context is present:**

- Peek layers: `previousProduct`/`nextProduct` images, absolutely positioned behind the current image, offset a few pixels left/right, scaled down slightly, lower z-index — a single thin sliver visible on each side where a product exists in that direction. No peek rendered on a side with no neighbor (start/end of list).
- Front layer: the current product's image, now with rounded corners + shadow + a small inset margin so it reads as a "card" sitting on top of the stack (a visual departure from today's edge-to-edge square image).
- The front layer is wrapped in a `motion.div` with `drag="x"` (from `motion/react`, already a project dependency). On drag end, if distance/velocity crosses a threshold, call `onNavigate(1)` or `onNavigate(-1)`; otherwise spring back to center.
- Switching the displayed product (via swipe or via the existing external chevron buttons) animates via `AnimatePresence` keyed on `product.id`.
- Existing category badge (top-left black pill) stays on the front layer, unchanged.
- `positionLabel`, when present, renders as a small pill (e.g. "3 of 24") over the image.
- Existing chevron buttons in `ProductModalProvider` are unchanged and continue to work side-by-side with swipe — swipe is additive.

### 2. Auto-pagination synced to PDP navigation

**Problem recap:** `productList` is captured once in `ProductModalProvider` state at `open(p, list)` time (`ProductModalProvider.tsx:39`) and never updated afterward, even though `CatalogGrid`'s own `visibleProducts` keeps growing via `loadMore()`.

**New context surface on `ProductModalContextValue`:**

```ts
interface ProductModalContextValue {
  open: (product: Product, list?: Product[]) => void;
  close: () => void;
  syncList: (list: Product[]) => void;
  registerPagination: (hasMore: boolean, loadMore: () => void) => void;
}
```

- `syncList(list)`: `CatalogGrid` calls this in a `useEffect` keyed on the `visibleProducts` reference. Inside the provider: `setProductList(prev => (prev ? list : prev))` — a no-op when no modal is open.
- `registerPagination(hasMore, loadMore)`: `CatalogGrid` calls this in a `useEffect` keyed on `[hasMore, loadMore]`. The provider stores the latest values in a ref (same pattern as the existing `loadMoreRef` in `CatalogGrid.tsx:50`, to avoid stale closures without re-running other effects on every identity change).
- New effect inside `ProductModalProvider`, keyed on `[currentIndex, productList]`: when `productList` is set, `currentIndex !== -1`, `currentIndex >= productList.length - 4`, and the registered `hasMore` is true, call the registered `loadMore()`. `loadMore` already no-ops on overlapping calls internally (`useCatalogProducts.ts`, guarded by `loadingMore`/`pageLoading`/`hasMore`), so calling it on every qualifying render is safe.

**Result:** browsing forward through the PDP (via swipe or chevrons) transparently fetches the next Firestore page in the background before the user reaches the end of the currently-known list, without duplicating the pagination logic that already lives in `useCatalogProducts`.

## Testing

- Manual verification in the browser (dev server): open the storefront, open a product from the grid, swipe/click through toward the end of the initially-loaded 16 products, confirm more products load in and navigation continues past the original boundary without a dead end.
- Manual verification that the standalone `/product?id=X` route still renders a plain, non-stacked image with no console errors.
- Manual verification on a touch device / touch emulation that drag-to-navigate works and doesn't fight with vertical page scroll.
