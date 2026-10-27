# Product Page Redesign (Part 1) — Design

Date: 2026-10-27
Branch: `feat/pdp-redesign` (from `feat/home-banners`, which is not yet merged)
Reference: user-supplied web mockup (cream theme, full-page product layout).

## Decomposition

The full mockup needs data the app does not have, so it is split:

1. **This spec — redesign using existing data** (layout, theme, accordions, related products, trust row, header navigation).
2. Product gallery (multiple images per product/color; admin upload; thumbnail rail from real images). Separate spec.
3. Rating, review count and per-product feature highlights (admin-entered fields). Separate spec.
4. Wishlist hearts (home cards and related cards). Separate spec.

## Scope

One `ProductDetailView` serves both the modal (opened from the catalog grid) and the standalone `/product?id=` page. Both get the new layout.

**In scope**
- Cream/black theme and the mockup's two-column layout.
- Header row: `← Back to Shop` (left); `N of M` with previous/next arrows (right, only when a list context exists).
- Left column: main image (existing swipe card stack, category tag, discount badge) with a thumbnail rail built from the product's color variants' images (shown only when there are 2+ variants).
- Right column: title, price row (current price, struck-through original, discount badge, COD-eligible chip), two-line description excerpt, image swatch cards for color/design with the selected name beside the label, square size chips (out-of-stock struck through, first in-stock size preselected), "Size Guide" link, availability box, quantity + full-width Add to Cart, trust row, accordions (Description, Size Chart, Shipping & Delivery).
- "You May Also Like": four products from the same category, excluding the current product, simple cards (image, name, price, original price), no hearts.
- Modal container widened (about 1100px) and prev/next arrows moved into the view header.
- State reset when navigating between products (the view is keyed by product id), and the modal scrolls to top on product change.

**Out of scope (later specs)**: gallery images, rating and review count, feature highlights row (180 GSM etc.), wishlist hearts, delivery-time promises ("ships within 1–2 days"), any database change.

## Design

### Components (under `src/features/product/presentation/` unless noted)
- `ProductDetailView.tsx` — rewritten layout; owns selection state (variant, size, quantity, open accordion). Props unchanged, plus optional `onSelectRelated?: (p: Product) => void` (default: `router.push('/product?id=<id>')`).
- `ProductImageStack.tsx` — unchanged behavior; gains an optional `discountPercent` badge.
- `Accordion.tsx` — controlled list of sections `{ id, title, content }` with `openId` and `onToggle`.
- `RelatedProducts.tsx` + `useRelatedProducts.ts` (application layer) — fetches the first 5 products of the category via `fetchProductsPage`, filters with `getRelatedProducts`, renders up to 4 cards.
- `domain/related.ts` — pure `getRelatedProducts(candidates, currentId, limit)`.
- `catalog/presentation/TrustStrip.tsx` — export its items as `TRUST_ITEMS` so the product page's trust row reuses them.
- `ProductModalProvider.tsx` — wider container, remove the external edge chevrons (now in the view header), `key={product.id}` on the view, scroll-to-top on product change, new `navigateTo(product)` for related-product clicks (replaces history state, keeps list context).
- `app/product/page.tsx` — container widened to `max-w-6xl`.

### Behavior
- Default size = `getDefaultSize(product)` (existing helper). Default variant = first variant.
- Stock box: green "In Stock (N left)" when stock > 0; neutral text when no size selected or unavailable; "Temporarily Out of Stock" when 0.
- Add to Cart keeps existing behavior (adds, resets quantity, closes the modal / navigates home on the standalone page).
- Shipping accordion states cash on delivery nationwide and the real delivery fees from `checkout/domain/pricing.ts` (৳70 city corporations, ৳110 Dhaka suburban, ৳130 elsewhere) read from the constants. No delivery-time claims.
- Size Chart accordion shows the existing size chart table when the product has a chart; "Size Guide" link opens and scrolls to it. Without a chart the link and section are hidden.

## Testing
- Vitest: `getRelatedProducts` (excludes current id, respects limit, preserves order, handles fewer candidates than limit, empty input).
- `npm run lint` and `npm test` pass.
- Manual: modal and `/product?id=` at desktop and mobile widths; prev/next, swipe, variant/size selection, add to cart, accordions, related click.

## Risks
- Thumbnail rail and swatches both come from variant images until the gallery spec lands (intentional, temporary duplication).
- Related selection is "first products of the same category by id", not a relevance ranking.
