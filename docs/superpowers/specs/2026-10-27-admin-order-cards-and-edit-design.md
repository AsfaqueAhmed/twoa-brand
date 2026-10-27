# Admin Order Cards + Edit Order — Design

Date: 2026-10-27. Branch `feat/admin-redesign` (do NOT merge to main until the user says so). Approved in chat ("run it in current branch").

## Order cards (`/admin/orders`)
- Collapsed row: `#` + last 8 chars of the id, status tag with a pencil that opens a status dropdown (replaces the five buttons), customer name + phone, item thumbnails stack + "N items", date, total, **Edit** button, expand chevron.
- Expanded (in place): full address, item list (size/variant tags), pricing breakdown (subtotal, delivery fee, discount + coupon code, total), Guest tag, Pay on Delivery tag.
- Delivery fee is not stored; derived as `total - subtotal + discount`.
- Rounded badges/buttons consistent with the dashboard's Recent Orders table.

## Edit order (`/admin/orders/edit?id=<orderId>`)
Static export is on (`output: 'export'`), so a query-param route is used, not `[id]`.
- Form prefilled from the order: name, phone, address (plain textarea — the order stores only a formatted address string, not area ids), items (add/remove/quantity, catalog or custom, reusing `ItemsCard`), delivery fee (editable number, prefilled from the derived fee), discount + coupon code. Total recalculated with `adminOrderTotal`.
- Status is changed from the order card, not here.
- Items are editable only while the order is `pending` or `confirmed`. For other statuses the items section is read-only and `p_items` is sent as null (server keeps existing items).

## Database
One new function `admin_update_order(...)` (security definer, `is_admin()` check). In one transaction: lock the order; if items are provided and status is editable, compute the net stock delta per (parent_id, size) between the stored items and the new items (catalog lines only, i.e. items with `parentProductId` and `selectedSize`), lock stock rows, fail with "Only N left in size X" when a positive delta exceeds stock, apply the deltas; update name/phone/address/items/total/discount/promo/updated_at; if the promo code changed, decrement the old coupon's `usage_count` (not below 0) and increment the new one. No table changes.
**A backup is taken first and the user's go-ahead is requested before the migration is applied** (standing rules).

## Testing
Pure helpers (short id, breakdown, edit permissions, order→draft mapping, stock-line delta preview) are unit-tested. UI verified by lint/build; admin sign-in is Google OAuth so no agent browser check.
