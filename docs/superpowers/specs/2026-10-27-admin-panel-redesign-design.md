# Admin Panel Redesign — Design

Date: 2026-10-27. Reference: Merchant Hub dashboard mockup (sidebar + dashboard). The storefront top bar (`Navbar`) is unchanged.

## Goals
- Replace the `AdminTabs` strip with a persistent left sidebar shell shared by all `/admin/*` routes.
- Add a dashboard home page at `/admin`.
- Restyle existing admin pages to match, keeping their logic.
- Add Customers, Sales Report, Product Performance, Customer Insights, Usage History, Shipping Zones, and Order Returns.

## Non-goals
Product Templates, Image Library, Tags, Subcategories, Offers: no backing data; not in nav until specced.

## Shell
- `src/app/admin/layout.tsx` renders `Navbar`, `RequireAdmin`, and `AdminShell` (sidebar + content). Pages drop their own Navbar/tabs/auth boilerplate.
- `AdminShell`: dark sidebar, collapsible groups (Inventory, Orders, Promotions, Size Charts, Product Feed, Reports, Settings), active-route highlight, pending-order badge on All Orders. Mobile: slide-in drawer.
- Nav config lives in one data file (`adminNav.ts`) so entries are added as pages are built.

## Routes
| Route | Content |
|---|---|
| `/admin` | Dashboard |
| `/admin/products` | InventoryManager (moved from `/admin`) |
| `/admin/parent-products`, `/orders`, `/coupons`, `/banners`, `/size-charts`, `/product-feed` | Existing, restyled |
| `/admin/customers`, `/admin/reports/sales`, `/admin/reports/products`, `/admin/reports/customers`, `/admin/coupons/usage`, `/admin/shipping` | New, derived from existing data |
| `/admin/returns` | New, `order_returns` table (migration) |

## Dashboard
Stat cards (orders, sales, products sold, new customers, each with % change vs previous period), sales line chart, orders-by-status donut, quick actions, low stock, recent orders, top sellers, recent activity. A date-range selector sits inside the dashboard (the top bar is untouched). Charts are plain SVG; no new dependencies.

## Data
- Pure aggregation functions in `src/features/admin/analytics/domain/` (stats, period comparison, status counts, daily sales series, top products, customers, low stock, activity feed) with vitest tests. Pages and charts consume their output.
- Orders come from the existing `fetchAllOrders`; products from the existing catalog repository.
- Status label mapping (no schema change): pending=Pending, confirmed=Processing, out_for_delivery=Out for Delivery/Shipped, delivered=Delivered, cancelled=Cancelled.
- Customers = orders grouped by `user_id` (name, email, phone, order count, total spent).
- `order_returns` (new migration): id, order_id, reason, status (requested/approved/rejected/refunded), created_at, updated_at; admin-only RLS via `is_admin()`.

## Error handling
Loading spinners and empty states per widget; a failed fetch shows an inline retry, not a blank page.

## Build order
1. Shell + routing. 2. Dashboard. 3. Restyle existing pages. 4. Derived report pages. 5. Order Returns + migration.
Each step is its own commit; `npm run lint` and `npm test` stay green.
