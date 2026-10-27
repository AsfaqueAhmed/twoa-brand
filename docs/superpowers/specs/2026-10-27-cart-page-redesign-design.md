# Cart Page Redesign — Design

## Goal
Replace the slide-out cart drawer with a full `/cart` page (desktop two-column, mobile stacked), per the approved mockup.

## Scope
- New `/cart` page; header cart icon links to it.
- Remove `CartDrawer`. Remove `isOpen`/`openCart`/`closeCart` from `CartProvider` if no callers remain.
- Per-row: image, name, color, size, variant thumbnails (switch color in-row), price with strikethrough + "N% OFF" badge, quantity stepper, line total, remove.
- Order summary, Cash on Delivery note, Proceed to Checkout.
- Trust badges strip.
- "You May Also Like" row.
- Empty state with Continue Shopping.

Out of scope: promo code entry (stays in checkout), delivery fee calculation (stays in checkout).

## Pricing consistency with checkout
Checkout computes `subtotal = Σ price × qty` (sale price), then adds delivery fee and subtracts coupon discount. The cart must not contradict it:
- **Subtotal** = `computeSubtotal(items)` (same value checkout uses).
- **You save** = `Σ (originalPrice − price) × qty` where `originalPrice > price`. Informational only; it is NOT subtracted again, because `price` is already the sale price. Hidden when 0.
- **Total** = Subtotal, with the note "Delivery fee and promo codes are applied at checkout."

The mockup's separate "Discount −৳300" line is a coupon discount; it is not reproduced in the cart.

## Domain (`features/cart/domain`, unit-tested)
- `computeSavings(items)` — as above.
- `discountPercent(product)` — rounded percent off, `undefined` when no discount.
- `changeVariant(items, productId, size, oldVariant, newVariant)` — updates the line in place; if a line with the same product, size and new variant exists, merges and caps quantity at `resolveAvailableStock`.

`CartProvider` exposes `changeVariant` alongside the existing actions.

## Presentation (`features/cart/presentation`)
- `CartPage` — layout, empty state.
- `CartItemRow` — row UI; card layout on mobile. Thumbnails come from `product.variants`; selected one highlighted; none shown for products without variants.
- `OrderSummary` — subtotal, savings, total, COD note, checkout button.
- `TrustBadges` — static strip.
- `CartRecommendations` — products sharing a category with cart items, excluding items in the cart and out-of-stock products, max 6; falls back to top-rated products. Reuses the existing product repository and card component where possible. "View All" links to home.

Route: `src/app/cart/page.tsx`.

## Testing
- Unit tests for `computeSavings`, `discountPercent`, `changeVariant` (in-place, merge, stock cap, no-variant product).
- Manual check of the running app against the mockup at desktop and mobile widths.

## Branch
`feat/cart-redesign`, cut from `main` in a separate worktree.
