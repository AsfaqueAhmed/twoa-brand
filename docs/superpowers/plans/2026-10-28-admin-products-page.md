# Admin All Products Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the list part of `/admin/products` to the user's reference (`docs/superpowers/specs/assets/products-page-design.webp`) with stats, filters, bulk actions, featured toggle, active/inactive visibility and a grid view.

**Architecture:** Pure list helpers (`productList.ts`, tested) drive small presentation components that replace the list markup inside `InventoryManager`; the add/edit form modal and its handlers stay. A new admin repository module performs toggles and bulk actions; one migration adds the two flags and hides inactive products from the public.

**Tech Stack:** Next.js 15 (static export), React 19, Tailwind 4, lucide-react, Supabase JS, vitest.

## Global Constraints

- Work stays on `feat/admin-redesign`. Never merge or push.
- Storefront `Navbar` NOT modified. No new npm dependencies. The product add/edit form modal in `InventoryManager.tsx` keeps working unchanged (its ids `product-edit-form-panel`, `admin-add-product-btn`, `inventory-search-input`, `admin-delete-prod-btn-*`, `image-cropper-modal` must still exist where they exist today, or be carried to their equivalents in the new list).
- No SKU anywhere. Stock levels: total 0 → Out of stock; 1–10 → Low stock; else In stock. Total stock = sum of the parent product's `stockBySize`; products without a parent show "—".
- Migrations are only WRITTEN by implementers; the controller backs up and applies (with the user's go-ahead).
- Do NOT run `next build` (a dev server is running from this folder); verify with `npm run lint` and `npm test`. Never `git add -f` or commit anything under `.superpowers/`. The UI cannot be exercised in a browser (admin sign-in is Google OAuth) — say so in reports.
- Each task ends green on lint + tests, in its own commit; messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Visual target: read the reference image first. Rounded corners (`rounded-lg` cards, `rounded-full` pills, `rounded-md` buttons), white cards on the cream shell, `border-[#EEEEEE]`, small gray labels, bold black values, green/amber/red status pills as in the reference.

## File Structure

- Create `src/features/admin/inventory/domain/productList.ts` (+ test).
- Create `supabase/migrations/20261028000100_product_visibility_featured.sql`; modify `src/shared/domain/types.ts` (Product: `isActive?: boolean; isFeatured?: boolean`), catalog product mapping/fetch in `src/features/catalog/infrastructure/firestoreProductsRepository.ts`, `src/features/admin/inventory/infrastructure/firestoreProductAdminRepository.ts`; create `src/features/admin/inventory/infrastructure/productBulkRepository.ts`.
- Create presentation under `src/features/admin/inventory/presentation/list/`: `ProductsHeader.tsx`, `ProductStatsRow.tsx`, `ProductFilterBar.tsx`, `ProductBulkToolbar.tsx`, `ProductsTable.tsx`, `ProductsGrid.tsx`, `ProductStatusPill.tsx`, `ProductsPagination.tsx`, `BulkCategoryModal.tsx`, `BulkStockModal.tsx`; modify `InventoryManager.tsx`.

---

### Task 1: Product list helpers (TDD)

**Files:** Create `src/features/admin/inventory/domain/productList.ts`, `productList.test.ts`.

**Interfaces — Produces:**
- `type StockLevel = 'in' | 'low' | 'out'`
- `LOW_STOCK_THRESHOLD = 10`
- `productTotalStock(p: Product): number | null` (null when no `parentProduct`)
- `stockLevel(total: number | null): StockLevel` (null or 0 → `'out'`; 1..10 → `'low'`; else `'in'`)
- `type ProductStatus = 'active' | 'low' | 'out' | 'inactive'`; `productStatus(p: Product): ProductStatus` (inactive when `p.isActive === false`, else from stock level)
- `type ProductFilters = { search: string; category: string; status: '' | 'active' | 'inactive'; stock: '' | StockLevel }` and `DEFAULT_FILTERS`
- `filterProducts(products: Product[], f: ProductFilters): Product[]` (search matches name, category, subcategory, id case-insensitively; empty filter fields mean "all"; status filter: `active` = `isActive !== false`, `inactive` = `isActive === false`; stock filter by `stockLevel(productTotalStock(p))`)
- `type ProductSort = '' | 'name' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'`; `sortProducts(products: Product[], sort: ProductSort): Product[]` (returns a new array; `''` keeps order; null stock sorts as 0; name A–Z case-insensitive)
- `paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; page: number; totalPages: number; from: number; to: number; total: number }` (page clamped to `[1, totalPages]`; empty list → `from = 0, to = 0, totalPages = 1`)
- `productStats(products: Product[]): { total: number; active: number; out: number; low: number; activePct: number; outPct: number; lowPct: number }` (active = `isActive !== false`; out/low counted over ALL products by stock level; percentages are rounded integers of total, 0 when total is 0)
- `activeFilterCount(f: ProductFilters, sort: ProductSort): number` (count of non-empty category/status/stock/search and non-empty sort)

- [ ] **Step 1: Write failing tests** covering every function above with small fixtures (Product objects with `parentProduct: { id, name, sizeOrder, stockBySize }`): stock total sum and null; level boundaries 0/1/10/11; status precedence (inactive over low/out); each filter alone and combined (search by name/category/id, status active/inactive, stock levels); each sort (including null stock treated as 0 and stability for `''`); paginate (middle page, last partial page, clamping out-of-range, empty list); stats (counts and percentage rounding, zero total); activeFilterCount. Run `npx vitest run src/features/admin/inventory/domain` — Expected: FAIL (module missing).
- [ ] **Step 2: Implement** the functions in `productList.ts` (no imports other than `Product` from `@/shared/domain/types`; `isActive` and `isFeatured` are added to the type in Task 2 — add them to `types.ts` as optional fields in THIS task so tests compile).
- [ ] **Step 3: Verify and commit**

Run: `npx vitest run src/features/admin/inventory/domain && npm run lint && npm test` — Expected: PASS.

```bash
git add src/features/admin/inventory/domain src/shared/domain/types.ts
git commit -m "feat(admin): product list helpers (stock, filters, sort, pagination, stats)"
```

---

### Task 2: Data layer — migration, mapping, bulk repository

**Files:**
- Create: `supabase/migrations/20261028000100_product_visibility_featured.sql` (WRITE ONLY — do not apply)
- Modify: `src/features/catalog/infrastructure/firestoreProductsRepository.ts`, `src/features/admin/inventory/infrastructure/firestoreProductAdminRepository.ts`
- Create: `src/features/admin/inventory/infrastructure/productBulkRepository.ts`

**Interfaces — Produces:**
- Migration:

```sql
-- Product visibility (hide from the storefront) and a featured flag.
alter table products
  add column is_active boolean not null default true,
  add column is_featured boolean not null default false;

-- Public (anon/customer) reads only see active products; the admin sees all.
drop policy if exists products_public_select on products;
create policy products_public_select on products for select using (is_active or is_admin());
```

- Catalog mapping: the row→Product mapper sets `isActive: row.is_active !== false` and `isFeatured: row.is_featured === true`. Storefront fetchers (`fetchProductsPage`, `fetchProductById`, and the existing `fetchAllProducts` used by storefront search via `getProducts`) filter `.eq('is_active', true)`. Add a NEW export `fetchAllProductsForAdmin(): Promise<Product[]>` (same mapping, NO is_active filter) used only by admin screens. Do not change the existing `fetchAllProducts` semantics for storefront callers (it now returns active only); update `useAdminData` (`src/features/admin/analytics/application/useAdminData.ts`) and InventoryManager's `refreshProducts` to call `fetchAllProductsForAdmin` so admin views (dashboard, low stock) still see everything.
- `saveProduct` payload is unchanged (the new columns are left untouched on edit; on insert they take defaults).
- `productBulkRepository.ts` (supabase errors thrown as `new Error(error.message)`):
  - `setProductFeatured(id: string, featured: boolean): Promise<void>`
  - `setProductsActive(ids: string[], active: boolean): Promise<void>` (single `.in('id', ids)` update; no-op on empty)
  - `changeProductsCategory(ids: string[], category: string, subcategory: string): Promise<void>` (sets `category` and `subcategory` (null when blank); no-op on empty)
  - `deleteProducts(ids: string[]): Promise<void>` (single `.in('id', ids)` delete; no-op on empty)
  - `adjustParentStock(parentIds: string[], mode: 'set' | 'add' | 'remove', amount: number): Promise<void>` — validates `amount` is a non-negative integer (throws `new Error('Enter a whole number of 0 or more.')`), reads `parent_product_size_stock` rows for `parentIds`, computes the new stock per row (`set` → amount; `add` → stock + amount; `remove` → max(0, stock − amount)), writes each row back (upsert on `(parent_id, size)`); no-op on empty `parentIds`. Put the pure computation in an exported `nextStock(current: number, mode, amount): number` in `src/features/admin/inventory/domain/productList.ts`, with unit tests (set/add/remove/floor at 0).

- [ ] **Step 1:** Tests first for `nextStock` (RED), then implement `nextStock`.
- [ ] **Step 2:** Write the migration, the mapping/filter changes, `fetchAllProductsForAdmin`, switch the admin callers, and write `productBulkRepository.ts`.
- [ ] **Step 3:** `npm run lint && npm test` — Expected: pass. Commit:

```bash
git add supabase/migrations/20261028000100_product_visibility_featured.sql src
git commit -m "feat(admin): product active/featured flags, bulk product repository (migration unapplied)"
```

---

### Task 3: List UI — header, stats, filters, table, pagination

**Files:** Create `ProductsHeader.tsx`, `ProductStatsRow.tsx`, `ProductFilterBar.tsx`, `ProductsTable.tsx`, `ProductStatusPill.tsx`, `ProductsPagination.tsx` under `src/features/admin/inventory/presentation/list/`; modify `InventoryManager.tsx`.

**Interfaces:**
- Consumes: Task 1 helpers; Task 2 `setProductFeatured`, `setProductsActive` (single-product active toggle via the "…" menu is NOT required — Active/Inactive is changed through bulk Change Status in Task 4); existing handlers in `InventoryManager` (`handleOpenCreateProduct`, `handleOpenEditProduct`, `handleDuplicateProduct`, `handleSplitVariants`, `handleDeleteProduct`, `splittingProductId`).
- Produces (props contracts Task 4 relies on):
  - `ProductsTable({ products: Product[]; selectedIds: string[]; onToggle: (id: string) => void; onToggleAllOnPage: () => void; allOnPageSelected: boolean; someOnPageSelected: boolean; onEdit: (p: Product) => void; onDuplicate: (p: Product) => void; onSplit: (p: Product) => void; onDelete: (p: Product) => void; onToggleFeatured: (p: Product, featured: boolean) => void; splittingProductId: string | null })`
  - `ProductStatusPill({ status: ProductStatus })`, `ProductsPagination({ from; to; total; page; totalPages; onPage })`.

Requirements: per the spec's Layout section and the reference image. `InventoryManager` owns: `filters` (`ProductFilters`), `sort` (`ProductSort`), `page`, `selectedIds`; derives `filtered = sortProducts(filterProducts(products, filters), sort)`, `pageData = paginate(filtered, page, 20)`, and stats from ALL products. Page resets to 1 when filters/sort change; selection is pruned to ids that still exist after reloads (reuse `pruneSelection` from `src/features/admin/orders/domain/orderView.ts` or an equivalent pure helper placed in `productList.ts` with a test). Replace the old search bar, table and old pagination markup in `InventoryManager`; keep the form modal, cropper, loading spinner (shown only on first load), and the existing delete confirmation behavior. Header: black split Add Product button (main → `handleOpenCreateProduct`, id `admin-add-product-btn`; chevron menu: "Add product", and a "Parent products" `Link` to `/admin/parent-products`). Filter bar: search input id `inventory-search-input`, category select (options from distinct product categories), status select, stock select, sort select, a Filter indicator showing `activeFilterCount`, and Reset (restores defaults). Table: columns Product / Category / Price / Stock (Total) / Status / Featured / Actions per the spec; color dots from `variants[].colorCode` (max 3 + "+n"), size chips from `parentProduct.sizeOrder` (max 4 + "+n"), stock bar width = `min(100, total / 100 * 100)`-style relative to a fixed 60-unit max (document the constant), red when low/out; Featured is an accessible switch (`role="switch"`, `aria-checked`) that calls `onToggleFeatured` and updates optimistically (revert + inline error text on failure); Actions: Edit button and a "…" menu with Duplicate, Split variants, Delete (delete button keeps id `admin-delete-prod-btn-<id>`). Responsive: on narrow screens the table scrolls horizontally inside its card.

- [ ] **Step 1:** Implement. **Step 2:** `npm run lint && npm test` — Expected: pass. **Step 3: Commit**

```bash
git add src/features/admin/inventory
git commit -m "feat(admin): redesigned products list with stats, filters and table"
```

---

### Task 4: Bulk toolbar, bulk modals, grid view

**Files:** Create `ProductBulkToolbar.tsx`, `BulkCategoryModal.tsx`, `BulkStockModal.tsx`, `ProductsGrid.tsx` under `.../presentation/list/`; modify `InventoryManager.tsx`.

**Interfaces:**
- Consumes: Task 2 repository functions (`setProductsActive`, `changeProductsCategory`, `deleteProducts`, `adjustParentStock`, `setProductFeatured`), Task 3 props contract, `categoryDocs` already loaded in `InventoryManager` for category/subcategory options.
- Produces: `ProductsGrid` with the same selection/edit/featured props as `ProductsTable` (cards: image, name, price, stock bar, status pill, featured star toggle, Edit).

Requirements:
- `ProductBulkToolbar({ selectedCount; onEdit; onChangeCategory; onUpdateStock; onChangeStatus: (active: boolean) => void; onDelete; viewMode: 'list' | 'grid'; onViewMode; busy })`: left side per the reference: select-all checkbox (reflects page selection), "N selected", buttons **Edit** (enabled only when exactly one selected), **Change Category**, **Update Stock**, **Change Status** (small dropdown: Set Active / Set Inactive), **More** (dropdown: Delete selected). Buttons disabled when nothing is selected (Edit when ≠ 1) or while `busy`. Right side: list/grid segmented toggle (default list).
- `BulkCategoryModal`: category select (from `categoryDocs`, plus a hint when none), subcategory select dependent on category (optional), Apply/Cancel; applies via `changeProductsCategory`.
- `BulkStockModal`: explains stock is shared by every product of a parent and lists how many distinct parent products will change (products without a parent are skipped and counted in the notice); mode radio Set / Add / Remove, whole-number amount input; confirm button text "Update N parent products"; applies via `adjustParentStock(distinctParentIds, mode, amount)`; shows the validation/RPC error inline.
- Modals: portal to `document.body`, `role="dialog"` with `aria-labelledby`, Escape and backdrop close, focus the first control on open.
- `InventoryManager` wiring: handlers run the repository call, reload products (silent reload — do not show the first-load spinner after the first load), keep or prune the selection as appropriate, and report errors inline (a dismissible error banner above the list; no `alert()`). Delete selected asks `window.confirm("Delete N products? This cannot be undone.")`. Change Status confirms nothing. `ProductsGrid` is rendered instead of the table when `viewMode === 'grid'` (same pagination, 20 per page, responsive 2/3/4 columns).

- [ ] **Step 1:** Implement. **Step 2:** `npm run lint && npm test` — Expected: pass. **Step 3: Commit**

```bash
git add src/features/admin/inventory
git commit -m "feat(admin): products bulk toolbar, bulk modals and grid view"
```

---

## Self-Review

- **Spec coverage:** header + split button, stats, filters, table, pagination (Task 3); bulk actions incl. Update Stock and Delete, grid view (Task 4); helpers (Task 1); flags + visibility + bulk repository + migration unapplied (Task 2); SKU omitted.
- **Placeholders:** none; presentation tasks specify props, behavior and the reference image.
- **Type consistency:** `ProductFilters`, `ProductSort`, `ProductStatus`, `paginate`, `productStats`, `nextStock`, bulk repository signatures and the table props contract are defined once and reused.
- **Risks for review:** RLS policy change hides inactive products from public reads (storefront + feed script) — the storefront fetchers also filter explicitly; admin screens (dashboard low stock, product list, `useAdminData`) must switch to `fetchAllProductsForAdmin`; `adjustParentStock` read-modify-write races; existing form modal behavior intact after removing the old list markup.
