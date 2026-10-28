# Admin All Products Page — Design

Date: 2026-10-28. Branch `feat/admin-redesign` (no merge to main until the user says so). Visual reference supplied by the user: `docs/superpowers/specs/assets/products-page-design.webp`. Redesigns the list portion of `InventoryManager` (`/admin/products`); the add/edit product form modal stays as it is.

## Included (user-selected)
Featured toggle, Active/Inactive visibility, Grid view, and all toolbar bulk actions (Edit, Change Category, Update Stock, Change Status, More → Delete). **Not included:** SKU (no data; the SKU line is omitted).

## Layout
- Header "All Products" + subtitle "Manage your products, variants, stock and visibility." and a black split **Add Product** button (main part opens the existing create form; chevron menu: "Add product", "Parent products" link).
- Four stat cards: Total Products, Active Products (+ % of total), Out of Stock (+ %), Low Stock (+ %). The "vs previous month" delta is omitted (no history).
- Filter bar: search (name, category, id), All Categories select, All Statuses select (Active/Inactive), Stock Status select (In stock / Low stock / Out of stock), Sort by select (Newest not available → Name A–Z, Price low–high, Price high–low, Stock low–high, Stock high–low), Filter-count indicator and Reset.
- Bulk toolbar: select-all checkbox + "N selected", Edit (enabled only when exactly one selected → opens the existing edit form), Change Category (modal: category + subcategory), Update Stock (modal), Change Status (Active/Inactive), More menu → Delete selected (confirm). View toggle (list / grid) and "Showing a–b of N" with prev/next (page size 20).
- Table row: checkbox, image, name, color dots (variant `colorCode`) and size chips (parent product `sizeOrder`, with "+n" overflow), category + subcategory, price + struck original price, total stock with a progress bar (green; red when low) , status pill (Active / Low Stock / Out of Stock / Inactive), Featured toggle, Edit button, "…" menu (Duplicate, Split variants, Delete — the existing handlers).
- Grid view: product cards (image, name, price, stock bar, status pill, featured star toggle, Edit).

## Derived rules
Stock total = sum of the parent product's `stockBySize` (no parent → 0 and shown as "—"). Stock level: 0 = Out of stock, 1–10 = Low stock, otherwise In stock. Status pill: Inactive when `isActive` is false; otherwise from stock level.

## Data / database
One migration (backup + the user's go-ahead before applying): `products.is_active boolean not null default true`, `products.is_featured boolean not null default false`, and the public select policy changes to `is_active or is_admin()` so inactive products are hidden from the storefront and the public API (admins still see everything). Storefront catalog fetchers also filter `is_active = true` explicitly; the admin list uses an unfiltered fetch. `saveProduct` leaves the new columns untouched when editing.
Bulk actions: Change Category updates `category`/`subcategory` on the selected products; Change Status sets `is_active`; Delete removes them (same as single delete); Update Stock adjusts the **parent products'** `parent_product_size_stock` rows for every size (modes Set / Add / Remove, floored at 0) and warns that stock is shared by all products of a parent.

## Testing
Pure helpers (stock totals/levels, filtering, sorting, pagination, stats) are unit-tested with vitest; UI verified by lint (admin sign-in is Google OAuth).
