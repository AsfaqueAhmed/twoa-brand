# Checkout Redesign — Design

## Goal
Restyle `/checkout` to the approved mockup: card sections on the left, sticky order summary on the right.

## Scope (layout and styling only)
- Header: "Back to Cart › Checkout" breadcrumb, title and COD subtitle. Guest sign-in nudge stays as a slim banner.
- Left cards: Delivery Information, Delivery Zone (display-only fee panel), Promo Code (input + Available Offers cards from active coupons), Payment Method (COD).
- Right: Order Summary (items with strikethrough original price, subtotal, discount, shipping, total), Applied Offer box, Risk-Free badge, Place Order button, terms line.

Out of scope: Email field, zone dropdown / "Change zone", new data fields. Pricing, coupon, stock and `placeOrder` logic are untouched.

## Structure (`features/checkout/presentation`)
`CheckoutForm` keeps all state, validation and handlers, and renders: `DeliveryInfoCard`, `DeliveryZoneCard`, `PromoCard`, `PaymentCard`, `CheckoutSummary`. The whole layout sits in one `<form>` so the submit button can live in the summary column.

## Testing
Existing pricing tests, `npm run lint`, `npm test`, manual check at desktop and mobile widths.
