# Admin Parent Products Page Redesign — Design

Date: 2026-10-28. Branch `feat/admin-redesign` (no merge to main until the user says so). No reference image: the user chose "match the new Products page". Scope chosen by the user: restyle + **linked products count** (no bulk actions, no inline stock edit).

## Layout (mirrors `/admin/products`)
- Header "Parent Products", subtitle "Manage the sizes and stock shared by your products." and a black **Add Parent Product** button (existing create handler/id).
- Four stat cards: Parent Products, Total Stock (sum of all sizes of all parents), Low Stock (parents with total 1–10), Out of Stock (parents with total 0), each with a % of total where meaningful.
- Filter bar (same padded 40px controls as the products filter bar): search (name, id), Stock Status select (In stock / Low stock / Out of stock), Sort by (Name A–Z, Stock low–high, Stock high–low, Linked products high–low), Filter count indicator, Reset.
- Table card (rounded, scrolls horizontally on narrow screens): image (the parent's `image`, else a neutral placeholder), name + id, size chips with per-size stock (e.g. `S 12`, low stock amber, zero red), Total stock with bar + status pill, **Linked products** (count, from products' `parentProductId`), Actions: Edit and Delete. Delete is disabled with a tooltip ("Unlink its N products first") when linked > 0; the repository already refuses deletion server-side.
- Pagination "Showing a–b of N", prev/next, 20 per page.
- The existing create/edit modal, its fields (name, image, sizes and per-size stock) and handlers stay working unchanged, as do their element ids.

## Data
No database change. Linked counts come from `fetchAllProductsForAdmin` grouped by `parentProductId`; parents from the existing parent-products fetcher.

## Testing
Pure helpers in `src/features/admin/parentProducts/domain/parentList.ts` (+ test): total stock, linked counts, filter, sort, stats; reuse `stockLevel`, `paginate`, `LOW_STOCK_THRESHOLD` from the inventory domain. UI verified by lint (admin sign-in is Google OAuth).
