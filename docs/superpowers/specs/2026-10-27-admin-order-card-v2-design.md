# Admin Order Card v2 — Design

Date: 2026-10-27. Branch `feat/admin-redesign` (no merge to main until the user says so). Visual reference supplied by the user: `docs/superpowers/specs/assets/order-card-design.webp` ("I like this one more"). Replaces the card from the earlier order-cards work; the Edit page and `admin_update_order` stay as-is.

## Included (user-selected)
Bulk select + actions, Add Note (new table), product gallery thumbnails. **Not included:** Print invoice (the Print quick action is omitted), SKU (not stored anywhere — omitted).

## Collapsed row
Checkbox · `#SHORTID` + copy-to-clipboard button (copies the full order id) · status pill with colored dot and a chevron that opens the status menu · avatar circle + customer name + Guest tag + phone · cart icon + "N items" · total · Edit button (links to `/admin/orders/edit?id=`) · expand chevron. Under the id: "Placed on 27 Oct 2026, 01:49 PM". When collapsed, item thumbnails sit between the customer and the cart count (as in the second card of the reference).

## Expanded
Row of four info cards: **Delivery Address** (address text, "Edit" link to the edit page), **Customer Contact** (phone, email or "— (no email)"), **Delivery Zone** (label derived from the delivery fee: 70 "Inside Dhaka City", 110 "Dhaka Suburban", 130 "Outside Dhaka", other "Custom fee"; fee badge), **Payment Method** (Cash on Delivery + tag "Unpaid", or "Paid" once delivered, "Void" when cancelled).
Left: **Order Items (N)** panel with a "View All Product Images" button (opens an image modal for all items). Each item row: large main image, up to 3 thumbnails from the live product's `gallery` (joined by product id; none for custom items or removed products), name, size and qty chips, line total.
Right column: **Order Summary** (subtotal, delivery fee with zone label, discount + coupon code when > 0, total), **Update Order Status** (select + black "Update Status" button, disabled when unchanged), **Quick Actions**: Add Note, Contact (`tel:` link), Cancel Order (confirm dialog; disabled when already cancelled/delivered).

## Notes
New table `order_notes (id uuid, order_id text → orders on delete cascade, note text, created_at)`, admin-only RLS (`is_admin()`), not a column on `orders` (customers can read their own order row, so a column would leak internal notes). The Add Note action opens an inline panel in the card listing notes (newest first) with a textarea + Save.

## Bulk select
Each card has a checkbox. The manager shows a toolbar above the list: select-all (filtered list), "N selected", a status select + Apply (updates each selected order sequentially via `updateOrderStatusAsAdmin`, reports failures), and Clear.

## Data
`AdminOrderManager` additionally loads products (`fetchAllProducts`) to look up galleries. Pure helpers (zone label, payment status, placed-on format, selection toggling) are unit-tested.

## Database
One migration (new table only). Backup + the user's go-ahead before applying (standing rules).
