# Product Gallery and Feature Row — Design

Date: 2026-10-27
Branch: `feat/pdp-gallery` (from `feat/pdp-redesign`, not yet merged)
Parts 2 and 3 of the PDP work; rating/review count and wishlist hearts are explicitly out of scope.

## Goals
1. A real thumbnail gallery on the product page: each product can have extra photos beyond its main image; shoppers click thumbnails to view them.
2. A per-product feature row (e.g. "180 GSM / Lycra Cotton", "Comfort Fit / All Day Wear") entered by the admin and shown on the product page.

## Data (migration `20260827000000_product_gallery_highlights.sql`, additive)
- `products.gallery text[] not null default '{}'` — extra image URLs (main image stays in `image_url`).
- `products.highlights jsonb not null default '[]'` — array of `{ icon, title, subtitle }`.
- Existing products and the live site are unaffected (defaults are empty; queries use `select *`). Variants JSON is unchanged: a variant still only swaps the main image.

## Domain (pure, unit-tested)
- `src/features/product/domain/gallery.ts`: `MAX_GALLERY_IMAGES = 8`; `getGalleryImages(mainImage: string, gallery: string[] | undefined): string[]` → `[mainImage, ...gallery]` with empty strings and duplicates removed, capped at `MAX_GALLERY_IMAGES + 1`; if `mainImage` is empty the gallery alone is returned.
- `src/features/product/domain/highlights.ts`: `HIGHLIGHT_ICON_KEYS` (`leaf`, `shirt`, `truck`, `shield`, `package`, `sparkles`, `ruler`, `droplets`, `wind`), `MAX_HIGHLIGHTS = 3`, `ProductHighlight = { icon: HighlightIconKey; title: string; subtitle: string }`, `normalizeHighlights(raw: unknown): ProductHighlight[]` — accepts anything (DB json), keeps objects with a non-empty trimmed `title`, trims strings, unknown/missing icon → `sparkles`, subtitle defaults to `''`, caps at `MAX_HIGHLIGHTS`.
- `Product` (shared types) gains `gallery?: string[]` and `highlights?: ProductHighlight[]`.

## Product page
- Thumbnail rail (desktop vertical, mobile horizontal) now lists `getGalleryImages(selectedVariant?.image || product.image, product.gallery)`; shown when there are 2+ images. Clicking a thumbnail sets the active image (index); selecting another color variant or navigating products resets the index to 0. Swatches still switch the main image per variant. The old variant-image rail is removed (swatches already cover variants).
- Feature row: when `product.highlights` is non-empty it replaces the trust row (grid of 1–3 columns: icon, title, subtitle); when empty the existing trust row stays.

## Admin (InventoryManager product form)
- "Gallery images" section: up to 8 extra images; add via the existing cropper (square) + `uploadProductImage` (unique path `products/<id>/gallery/<timestamp>`), remove, and move left/right to reorder.
- "Feature row" section: up to 3 rows with an icon select, title, subtitle; blank-title rows are dropped on save.
- Both load when editing and are included in `saveProduct`.

## Testing
- Vitest for `getGalleryImages` and `normalizeHighlights`.
- `npm run lint`, `npm test`. Manual after the migration is applied: upload gallery images and a feature row in admin, check the product page at desktop/mobile.

## Out of scope
Rating/review count, wishlist hearts, per-variant galleries, drag-and-drop reordering, image zoom.
