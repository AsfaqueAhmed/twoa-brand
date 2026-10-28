# Admin: Create Custom Order — Design

Date: 2026-10-27. Extends the admin panel redesign (branch `feat/admin-redesign`). Approved by the user in chat.

## Goal
Let an admin create an order by hand (phone/WhatsApp/Facebook orders) from `/admin/orders/new`, with catalog items and free-form custom items.

## Entry points
- "Create Order" button in the All Orders page header (`AdminOrderManager`), linking to `/admin/orders/new`.
- A "Create Order" Quick Action on the dashboard. No new sidebar entry (the route sits under All Orders in nav matching: `activeHref` already maps `/admin/orders/new` to `/admin/orders`).

## Page
Card-based form with a sticky summary on desktop:
1. **Customer:** reuse `DeliveryInfoCard` (name, phone, division/district/thana/city-corp, street address) from checkout. Address string is built exactly like `CheckoutForm` (street, thana, city corp, district, division, "Bangladesh").
2. **Items:** two add paths.
   - Catalog product: search products, choose size (from `parentProduct.sizeOrder`, quantity capped by `stockBySize`) and variant if any, quantity.
   - Custom item: name, unit price, quantity. `productId = custom_<random>`, `image_url = ''`, no stock reservation.
3. **Pricing:** delivery fee auto-filled by `computeDeliveryFeeByZone` with an override field; discount is a free amount field, optionally filled by applying a coupon code via `applyCoupon` (guest semantics, `user: null`), which also records `promoCode` so `place_order` increments usage; total = `computeTotal`.
4. **Initial status:** default Pending; any other status is applied with `updateOrderStatusAsAdmin` right after creation.

## Data flow
`createOrder(orderId, payload)` (the `place_order` RPC) with `userId: 'guest'`, `userEmail: ''`, items = catalog lines (via the shared order-item payload) + custom lines, `cartLines = buildStockLines(catalog items only)`. The RPC reserves stock atomically; a stock error is shown inline and nothing is created. On success: redirect to `/admin/orders`.

## Out of scope
Editing orders after creation; customer notifications; schema changes (items are free-form jsonb already).

## Testing
Pure helpers (order-item payload, draft totals, draft validation, address formatting) are unit-tested with vitest; UI is verified by lint/build (admin sign-in is Google OAuth, so no browser check is possible in the agent environment).
