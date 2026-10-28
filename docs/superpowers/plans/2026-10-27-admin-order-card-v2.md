# Admin Order Card v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the All Orders card to the user's reference design (`docs/superpowers/specs/assets/order-card-design.webp`) with bulk select, order notes and product gallery thumbnails.

**Architecture:** Pure helpers extend `orderView.ts`; the card is split into small focused components; notes get their own admin-only table + repository; the manager owns selection state and a bulk toolbar.

**Tech Stack:** Next.js 15 (static export), React 19, Tailwind 4, lucide-react, Supabase JS, vitest.

## Global Constraints

- Work stays on `feat/admin-redesign`. Never merge or push.
- Storefront `Navbar` NOT modified. No new npm dependencies. Pages render inside the admin shell.
- Existing behavior of `AdminOrderManager` is preserved: search input `id="admin-order-search"`, status filter tabs, loading/empty states, refresh, status update with `alert('Failed to update status.')`, card id `admin-order-row-<id>`, Edit link id `admin-order-edit-<id>`.
- Delivery fee is derived (`orderBreakdown`); payment status is derived (not stored).
- Notes live in a NEW table (never a column on `orders`) with admin-only RLS.
- Migrations are only WRITTEN by implementers. The controller takes a backup and asks the user before applying.
- Do NOT run `next build` (a dev server is running from this folder and the build corrupts its `.next`); verify with `npm run lint` and `npm test`. Never `git add -f` anything under `.superpowers/`.
- Admin sign-in is Google OAuth: the UI cannot be exercised in the agent's browser; say so in reports.
- Each task ends green on lint + tests, in its own commit; messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Visual target: read the reference image first (`Read` on the .webp path above). Rounded corners (`rounded-lg` cards, `rounded-full` pills, `rounded-md` buttons), white cards on the cream shell, `border-[#EEEEEE]`, small gray labels, bold black values.

## File Structure

- Modify `src/features/admin/orders/domain/orderView.ts` (+ test): `deliveryZoneLabel`, `paymentStatus`, `formatPlacedOn`, `toggleSelected`.
- Create `supabase/migrations/20261027000300_order_notes.sql`; create `src/features/admin/orders/domain/orderNote.ts`, `infrastructure/orderNotesRepository.ts`.
- Create/rewrite presentation (all in `src/features/admin/orders/presentation/`): `OrderStatusMenu.tsx` (pill variant), `AdminOrderCard.tsx` (collapsed row + composition), `OrderInfoCards.tsx`, `OrderSummaryPanel.tsx`, `OrderStatusUpdater.tsx`, `OrderQuickActions.tsx`, `OrderNotesPanel.tsx`, `OrderItemsPanel.tsx`, `OrderImagesModal.tsx`, `BulkToolbar.tsx`; modify `AdminOrderManager.tsx`.

---

### Task 1: Card helpers (TDD)

**Files:** Modify `src/features/admin/orders/domain/orderView.ts`, `orderView.test.ts`.

**Interfaces — Produces:**
- `deliveryZoneLabel(fee: number): string` — 70 → `'Inside Dhaka City'`, 110 → `'Dhaka Suburban'`, 130 → `'Outside Dhaka'`, anything else → `'Custom fee'`
- `paymentStatus(status: OrderStatus): 'Unpaid' | 'Paid' | 'Void'` — delivered → Paid, cancelled → Void, otherwise Unpaid
- `formatPlacedOn(iso: string): string` — e.g. `27 Oct 2026, 01:49 PM` (en-GB day/short month/year, 12-hour time with AM/PM uppercase, `, ` separator)
- `toggleSelected(selected: string[], id: string): string[]` — adds if absent, removes if present, never duplicates

- [ ] **Step 1: Add failing tests** to `orderView.test.ts`:

```ts
import { deliveryZoneLabel, paymentStatus, formatPlacedOn, toggleSelected } from './orderView';

describe('deliveryZoneLabel', () => {
  it('maps the three fixed fees and falls back to custom', () => {
    expect(deliveryZoneLabel(70)).toBe('Inside Dhaka City');
    expect(deliveryZoneLabel(110)).toBe('Dhaka Suburban');
    expect(deliveryZoneLabel(130)).toBe('Outside Dhaka');
    expect(deliveryZoneLabel(95)).toBe('Custom fee');
  });
});

describe('paymentStatus', () => {
  it('derives from order status', () => {
    expect(paymentStatus('pending')).toBe('Unpaid');
    expect(paymentStatus('confirmed')).toBe('Unpaid');
    expect(paymentStatus('out_for_delivery')).toBe('Unpaid');
    expect(paymentStatus('delivered')).toBe('Paid');
    expect(paymentStatus('cancelled')).toBe('Void');
  });
});

describe('formatPlacedOn', () => {
  it('formats day, short month, year and 12-hour time', () => {
    expect(formatPlacedOn('2026-10-27T13:49:44')).toBe('27 Oct 2026, 01:49 PM');
    expect(formatPlacedOn('2026-01-05T00:05:00')).toBe('05 Jan 2026, 12:05 AM');
  });
});

describe('toggleSelected', () => {
  it('adds, removes and never duplicates', () => {
    expect(toggleSelected([], 'a')).toEqual(['a']);
    expect(toggleSelected(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleSelected(['a'], 'b')).toEqual(['a', 'b']);
  });
});
```

Run `npx vitest run src/features/admin/orders/domain` — Expected: FAIL.

- [ ] **Step 2: Implement** (append to `orderView.ts`; implement `formatPlacedOn` by hand, not with `toLocaleString`, so output is locale-independent):

```ts
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function deliveryZoneLabel(fee: number): string {
  if (fee === 70) return 'Inside Dhaka City';
  if (fee === 110) return 'Dhaka Suburban';
  if (fee === 130) return 'Outside Dhaka';
  return 'Custom fee';
}

export function paymentStatus(status: OrderStatus): 'Unpaid' | 'Paid' | 'Void' {
  if (status === 'delivered') return 'Paid';
  if (status === 'cancelled') return 'Void';
  return 'Unpaid';
}

export function formatPlacedOn(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(h12)}:${pad(d.getMinutes())} ${hours < 12 ? 'AM' : 'PM'}`;
}

export function toggleSelected(selected: string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
}
```

- [ ] **Step 3: Verify and commit**

Run: `npx vitest run src/features/admin/orders/domain && npm run lint && npm test` — Expected: PASS.

```bash
git add src/features/admin/orders/domain
git commit -m "feat(admin): order card v2 helpers (zone label, payment status, selection)"
```

---

### Task 2: Order notes table + repository

**Files:**
- Create: `supabase/migrations/20261027000300_order_notes.sql` (WRITE ONLY — do not apply)
- Create: `src/features/admin/orders/domain/orderNote.ts`, `src/features/admin/orders/infrastructure/orderNotesRepository.ts`

**Interfaces — Produces:**
- `interface OrderNote { id: string; orderId: string; note: string; createdAt: string }`
- `listOrderNotes(orderId: string): Promise<OrderNote[]>` (newest first), `addOrderNote(orderId: string, note: string): Promise<void>` (trims; throws `new Error('Note cannot be empty.')` if empty after trim, before any request), `deleteOrderNote(id: string): Promise<void>`. Supabase errors are thrown as `new Error(error.message)`, same style as `orderReturnsRepository.ts`.

- [ ] **Step 1: Migration**

```sql
-- Internal admin notes on orders. A separate table (not a column on orders)
-- because customers can read their own order row; notes must stay admin-only.
create table order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index order_notes_order_id_idx on order_notes(order_id, created_at desc);

alter table order_notes enable row level security;
create policy order_notes_admin_all on order_notes for all using (is_admin()) with check (is_admin());
```

- [ ] **Step 2: Domain type + repository** (mirror `src/features/admin/returns/infrastructure/orderReturnsRepository.ts`: snake_case ↔ camelCase mapper `toNote`, `supabase` from `@/shared/infrastructure/supabase/client`). Add a small test for the empty-note guard if it can be tested without the network (the guard runs before any request): `await expect(addOrderNote('o', '   ')).rejects.toThrow('Note cannot be empty.')` in `orderNotesRepository.test.ts` (mock nothing; the guard must throw first). If importing the supabase client in a node test fails, move the guard into a pure `normalizeNote(note: string): string` in `orderNote.ts` (throws on empty) and test that instead.

- [ ] **Step 3: Verify and commit** — `npm run lint && npm test` — Expected: pass.

```bash
git add supabase/migrations/20261027000300_order_notes.sql src/features/admin/orders
git commit -m "feat(admin): order notes table migration (unapplied) and repository"
```

---

### Task 3: Redesigned card shell, info cards, summary, status updater, quick actions

**Files:** Rewrite `OrderStatusMenu.tsx` (pill variant) and `AdminOrderCard.tsx`; create `OrderInfoCards.tsx`, `OrderSummaryPanel.tsx`, `OrderStatusUpdater.tsx`, `OrderQuickActions.tsx`, `OrderNotesPanel.tsx`; modify `AdminOrderManager.tsx` (props wiring only; selection comes in Task 5).

**Interfaces:**
- Consumes: Task 1 helpers, Task 2 notes repository, existing `orderBreakdown`, `orderItemCount`, `shortOrderId`, `STATUS_LABELS`, `STATUS_ORDER`, `formatCurrency`.
- `AdminOrderCard` props (final contract, Task 4/5 extend it): `{ order: Order; onStatusChange: (s: OrderStatus) => void; selected?: boolean; onToggleSelected?: () => void; productsById?: Map<string, Product> }`. Without `selected/onToggleSelected` no checkbox renders; without `productsById` no gallery.

Requirements (read the reference image and the current components first):
- `OrderStatusMenu`: restyle to the reference's pill — colored dot + uppercase label + chevron-down in one rounded-full bordered button that opens the existing dropdown (keep Escape/outside-click handling; add: Escape returns focus to the trigger; do not call `onChange` when choosing the current status). One button replaces the tag+pencil pair.
- `AdminOrderCard`: collapsed row per spec (checkbox slot, `#SHORTID` + copy button using `navigator.clipboard.writeText(order.id)` with a brief check-icon confirmation and a graceful no-op if the clipboard API is missing, status pill, avatar circle (`User` icon in a gray circle) + name + Guest tag + phone, thumbnails when collapsed + cart icon + "N items", total, Edit link (id `admin-order-edit-<id>`, `Pencil` icon, rounded-md bordered), expand chevron `aria-expanded`). "Placed on <formatPlacedOn>" under the id. Expanded: `OrderInfoCards` row, then a two-column layout (`lg:grid-cols-[1fr_320px]`): left slot for items (a simple list of name × qty, size, line total for now — Task 4 replaces it with `OrderItemsPanel`), right column `OrderSummaryPanel`, `OrderStatusUpdater`, `OrderQuickActions`.
- `OrderInfoCards`: four cards per spec (Delivery Address with "Edit" `Link` to the edit page; Customer Contact; Delivery Zone using `deliveryZoneLabel(deliveryFee)` + fee badge; Payment Method "Cash on Delivery" + `paymentStatus` pill: Unpaid amber, Paid green, Void gray).
- `OrderSummaryPanel`: Subtotal (N items), Delivery Fee (zone label), Discount (+ `promoCode`) only when > 0, bold Total.
- `OrderStatusUpdater`: `<select>` of all statuses (value = pending local choice, initial = order status) with a colored dot, and a black full-width "Update Status" button disabled when the choice equals the current status; on click calls `onStatusChange(choice)`.
- `OrderQuickActions`: three buttons in the reference style: **Add Note** (toggles `OrderNotesPanel` under the actions), **Contact** (`<a href={"tel:" + phone}>`), **Cancel Order** (red; `window.confirm('Cancel this order?')` then `onStatusChange('cancelled')`; disabled and dimmed when status is `cancelled` or `delivered`). No Print button.
- `OrderNotesPanel`: loads `listOrderNotes(order.id)` when first opened; shows notes (text + `formatPlacedOn(createdAt)` + delete button), a textarea and "Save note" (calls `addOrderNote` then reloads); loading, empty ("No notes yet."), and error states (a failed load — e.g. table not yet created — shows "Couldn't load notes." with a Retry, never crashes the card).
- `AdminOrderManager`: keep all existing behavior; render the new card; list spacing `space-y-3`.

- [ ] **Step 1:** Implement. **Step 2:** `npm run lint && npm test` — Expected: pass. **Step 3: Commit**

```bash
git add src/features/admin/orders
git commit -m "feat(admin): order card v2 shell with info cards, summary, status updater and notes"
```

---

### Task 4: Items panel with gallery

**Files:** Create `OrderItemsPanel.tsx`, `OrderImagesModal.tsx`; modify `AdminOrderCard.tsx` and `AdminOrderManager.tsx`.

**Interfaces:**
- Consumes: `productsById?: Map<string, Product>` prop on `AdminOrderCard` (declared in Task 3).
- `AdminOrderManager` loads products once with `fetchAllProducts` (`@/features/catalog/infrastructure/firestoreProductsRepository`) alongside orders; a products failure must NOT block the orders list (cards simply render without thumbnails); builds `productsById` with `useMemo` and passes it to each card.
- `OrderItemsPanel({ order, productsById })`: header "Order Items (N)" (N = number of lines) with a "View All Product Images" button (opens `OrderImagesModal`); each line per reference: large main image (`item.image`, placeholder box when empty), up to 3 thumbnails from `productsById.get(item.productId)?.gallery` (skip when missing/empty; fall back to showing nothing rather than the main image), name, size and qty chips (and variant name chip when set), line total `formatCurrency(price * quantity)`. No SKU. Replaces the placeholder list from Task 3.
- `OrderImagesModal({ images: { src: string; label: string }[]; onClose })`: fixed overlay (`z-50`), grid of images with labels, close button (`aria-label="Close"`), closes on Escape and backdrop click, traps nothing fancy; renders "No images available." when empty. The card builds `images` from every line's main image plus gallery (de-duplicated by src).

- [ ] **Step 1:** Implement. **Step 2:** `npm run lint && npm test` — Expected: pass. **Step 3: Commit**

```bash
git add src/features/admin/orders
git commit -m "feat(admin): order items panel with gallery thumbnails and image viewer"
```

---

### Task 5: Bulk select toolbar

**Files:** Create `BulkToolbar.tsx`; modify `AdminOrderManager.tsx`.

**Interfaces:**
- Consumes: `toggleSelected` (Task 1); `selected`/`onToggleSelected` props on `AdminOrderCard` (Task 3).
- `BulkToolbar({ total: number; selectedCount: number; allSelected: boolean; onToggleAll: () => void; onApply: (status: OrderStatus) => Promise<void>; onClear: () => void; busy: boolean })`.

Requirements:
- `AdminOrderManager` owns `selected: string[]`. Card checkbox → `toggleSelected`. Selection is pruned to ids that still exist in the filtered list when orders reload or filters change.
- Toolbar sits above the list (always visible when there are orders): a select-all checkbox for the currently filtered orders (checked when all are selected; indeterminate when some), text "N selected" (or "Select all" when none), and — only when `selectedCount > 0` — a status `<select>`, an "Apply" button and "Clear". While `busy`, controls are disabled.
- Apply: updates each selected order sequentially with `updateOrderStatusAsAdmin`; collects failures; after the loop refreshes orders once; if any failed, `alert` "Updated X of Y orders. Failed: #id, #id" (using `shortOrderId`); on full success clear the selection. Confirm with `window.confirm` when the chosen status is `cancelled`.
- Selected cards get a subtle highlight (`ring-1 ring-black`).

- [ ] **Step 1:** Implement. **Step 2:** `npm run lint && npm test` — Expected: pass. **Step 3: Commit**

```bash
git add src/features/admin/orders
git commit -m "feat(admin): bulk select and bulk status update for orders"
```

---

## Self-Review

- **Spec coverage:** collapsed row + copy + pill + avatar + thumbs + Edit (Task 3); four info cards + summary + status updater + quick actions without Print (Task 3); notes table + panel (Tasks 2–3); gallery + View All Images + no SKU (Task 4); bulk select (Task 5); helpers (Task 1); migration unapplied with backup + go-ahead (Global Constraints).
- **Placeholders:** none; UI tasks specify props and behavior and point at the reference image and sibling components.
- **Type consistency:** `AdminOrderCard` props are declared once in Task 3 and only extended by usage in Tasks 4–5; helper names match across tasks.
- **Risks for review:** clipboard API absence; notes load failing before the migration is applied; bulk apply partial failures; gallery join missing products; `formatPlacedOn` locale independence.
