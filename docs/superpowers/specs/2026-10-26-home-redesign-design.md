# Home Page Redesign — Design

Date: 2026-10-26
Branch: `feat/home-redesign`
Reference: web mockup supplied by the user (cream theme, split hero, trust strip, pill filters, richer product cards).

## Scope

Sub-project 1 of 2. Frontend-only restyle of the home page plus selectable variant/size on product cards.

**In scope**
- Cream/black theme on the home page and navbar.
- Split hero (`HeroBanner`) with fixed default content.
- Trust strip (`TrustStrip`): Cash on Delivery, 100% Risk-Free, Nationwide Delivery.
- Pill-style category and subcategory filters; search box beside them.
- Navbar: "AUTHENTIC & AESTHETIC" tagline next to logo, cart count badge.
- Product card redesign with selectable color variant and size, and Add to Cart straight from the grid.

**Out of scope**
- Backend-managed hero / drag-and-drop home editor (sub-project 2, separate spec). No new tables, no admin pages, no storage changes here.
- Wishlist hearts, Merchant Hub nav link.

## Design

### Section components
Each home section is a standalone component under `src/features/catalog/presentation/` taking plain props (no data fetching of its own), so sub-project 2 can later feed them from stored block JSON without a rewrite.

- `HeroBanner` — props: `eyebrow`, `headline`, `subtext`, `primaryCta`, `secondaryCta`, optional `imageUrl`. Two columns on desktop, stacked on mobile. Without `imageUrl` it renders a cream hero with text only. Defaults come from a `homeContent.ts` constants file; `imageUrl` is unset until sub-project 2 (a file dropped at `public/branding/hero.jpg` is not auto-detected).
- `TrustStrip` — three static items with lucide icons.
- `CatalogGrid` — drops the black hero box; hosts search, pill filters and the grid. Filtering logic in `domain/filter.ts` is unchanged.
- `Navbar` — tagline and cart badge only.
- `app/page.tsx` — composes `HeroBanner`, `TrustStrip`, `CatalogGrid`; skeleton loading state preserved.

### Product card
- Image area: category tag, discount badge, variant thumbnails (existing behavior), out-of-stock overlay.
- Body: name, description, selected color name with swatch, selectable size chips (in-stock sizes only), price with struck-through original, full-width Add to Cart.
- State: `activeVariantIndex` (existing; thumbnail click/hover selects variant) and `selectedSize` (first in-stock size by default; reset if it goes out of stock).
- Auto-rotation of variants (existing) continues only while the card is not hovered; picking a variant explicitly stops rotation for that card.
- Add to Cart calls `addToCart(product, 1, selectedSize, selectedVariant)` directly. Clicking elsewhere on the card still opens the product modal. `CartProvider` already accepts size and variant, so it is not changed.
- Products with no `parentProduct` sizes add with no size.
- Out-of-stock products keep the disabled button.

Pure helper `getDefaultSize(product)` lives in the catalog domain layer and is unit-tested.

### Theme
Use existing `#FAF9F6` as the page background, black for primary actions, `#EEEEEE` borders. Keep square corners on cards and buttons; pills for filters only. Tokens are applied in the components, not a global theme change, to avoid touching checkout, orders and admin.

## Testing
- Vitest: `getDefaultSize` (first in-stock size, none in stock, no parent product).
- Manual: dev server at desktop and mobile widths compared to the mockup; filter, search, variant/size selection, add to cart from grid, modal open on card click, loading skeleton, empty state.
- `npm run lint` (tsc) and `npm test` pass.

## Risks
- Hover-driven variant selection and tap on touch devices: thumbnails select on click; hover-select remains desktop-only via existing behavior.
- Cart badge needs the cart item count from `CartProvider`; verify it is exposed, otherwise derive from items.
