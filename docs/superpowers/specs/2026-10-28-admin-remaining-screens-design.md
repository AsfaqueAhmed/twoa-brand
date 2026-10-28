# Admin Remaining Screens — Style Rollout

Date: 2026-10-28. Branch `feat/admin-redesign` (no merge to main until the user says so). The user asked to bring all other admin screens to the style of the new Products page (selected groups: Coupons + Usage History, Banners + Size Charts, Customers + Returns, Reports + Shipping + Feed). Already done: Dashboard, Orders, Products, Parent Products, Categories.

## Style kit (shared, `src/features/admin/presentation/ui/`)
Page header (`AdminPageHeader`) with a black primary action; row of stat cards (rounded-xl, icon tile, big number, small caption/percentage); filter bar card (`#FAF9F6`, 40px controls, custom-chevron selects, search with icon, Filter indicator + Reset); rounded table card (header row in small gray text, `divide-y`, hover row, horizontal scroll on narrow screens); rounded status pills with a colored dot; "Showing a–b of N" pagination (20/page). Loading = spinner on first load only; errors = dismissible inline banner; empty = EmptyState; no `alert()`.

## Per-screen content
- **Coupons:** stats (Total, Active, Expired, Total redemptions); filters (search code, status Active/Inactive/Expired, type); table (code, type + value, min subtotal, district, usage bar used/limit, expiry, status pill, Edit/Delete). Keep the create/edit form. **Usage History:** stats + table sorted by usage.
- **Banners:** stats (Total, Active/visible, scheduled if applicable) and a card grid/table with preview image, title, link, status, Edit/Delete; keep BannerForm. **Size Charts:** stats (Total charts, linked products), search, table (name, columns, rows count, linked products), Edit/Delete; keep the form.
- **Customers:** stats (Customers, Repeat customers, Avg order value, Total revenue), search + sort, table (avatar, name + Guest tag, contact, orders, total spent, last order). **Order Returns:** stats per status, search + status filter, table (order link, reason, status pill, date, actions), Log Return as a modal.
- **Reports (Sales, Product Performance, Customer Insights), Shipping Zones, Product Feed:** shared header/range select styled like the filter selects, stat cards via the shared StatCard, table cards with pagination where lists are long.

## Constraints
No database changes; no behavior changes beyond list/layout presentation (forms, handlers, ids stay); storefront Navbar untouched; no new dependencies.
