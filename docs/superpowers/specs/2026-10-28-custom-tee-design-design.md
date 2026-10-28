# Custom Tee Design — Phase A (selection picker)

## Roadmap (one spec per phase)

- **A. Picker (this spec):** `/custom-tee` four-step selection, ends at a hand-off screen.
- **B. Parent view images:** admin uploads front/back/left/right images on a Parent Product (migration + admin UI + `ParentProduct` type). Prerequisite for studio views.
- **C. Design Studio v2:** the reference layout (left tool rail, canvas, right panel): image + text layers, layers list (visibility, reorder), position/scale/align/flip, undo/redo, zoom/fullscreen, Front/Back/Left/Right views using phase B images.
- **D. Commerce:** price source, Add to Cart, artwork upload storage, order persistence, Free Gallery.

Parent/Product classification (category + subcategory required on parents, inherited by products) is **already implemented**.

## Scope of phase A

Customer-facing `/custom-tee`: pick a base tee via four dependent selections, then hand off. No studio, price, cart or stock changes.

## Data

- No schema change, no migration.
- Eligibility from existing `ParentProduct` (`category`, `subcategory`, `sizeOrder`, `stockBySize`) via `fetchAllParentProducts`.
- Card extras derived from products linked by `parentProductId`: photos (the parent's own `image` only; linked product images/galleries are not used). Only parents with a non-empty `image` are shown in the picker, colors (union of linked `variants`), SKU shown as a short code from the parent id (parents have no SKU field).
- Eligible = `stockBySize[size] > 0`. Parents without a subcategory are not reachable in this flow (subcategory is a required step).

## Structure (`src/features/customTee/`)

- `domain/selection.ts` (pure, tested): `eligibleCategories/Subcategories/Sizes/Parents`, `selectableParents`, `selectCategory/Subcategory/Size/Parent` reducers (each clears later steps), `isComplete`, `isStepOneComplete`, `validateSelection`.
- `domain/cards.ts` (pure, tested): `buildParentCard`.
- `application/useCustomTeeData.ts`: loads parents + products; `refreshParents()` re-reads stock.
- `presentation/`: `Modal` (generic dialog shell), `Stepper`, `SelectionStepOne`, `SelectionStepTwo`, `ParentCard`, `CustomTeeModal` (orchestration), `CustomTeeProvider` (+ `useCustomTee`), `CustomTeeLanding`.
- `src/app/custom-tee/page.tsx`: thin route rendering the landing page.

## Behavior (popup)

The picker is a centered modal (bottom sheet on phones) with a close button, dimmed backdrop, Escape / backdrop-click to close, and body scroll locked while open. A two-step stepper sits at the top.

1. **Step 1, Category & size:** Category -> Subcategory (only those with eligible parents) -> Size (only sizes with stock among matches). **Next** appears only when `isStepOneComplete`.
2. **Step 2, Choose tee:** image cards (parent image, name, SKU code, colors, "Size M: N pcs"), **Back** to step 1, and **Continue to Design Studio** once a card is selected (`isComplete`).
3. Only parents with a non-empty image are shown; cards use the parent image only.
4. Empty states: no subcategories; no sizes with stock; no matching parents.
5. On Continue, inputs lock, stock is re-fetched and the selection revalidated. If invalid, the selection is truncated, a notice is shown, and the user returns to step 1 (or stays on step 2 if only the tee became unavailable). Selecting never changes stock.
6. On success, `sessionStorage['custom-tee-selection']` = `{ parentProductId, size }` and the modal shows a "Tee selected" summary (placeholder for the phase C studio) with Change tee / Close.
7. **Opening:** the "Custom Tee" nav tab (desktop and mobile bar) opens the modal over the current page via `useCustomTee().open()`. `/custom-tee` renders a simple landing page that opens the modal on mount, so direct links work; closing it leaves the landing page. Closing discards in-modal selection state.

## Testing

- Vitest for `selection.ts` (cascading resets, stock-0 exclusion, canonical size order, empty cases, revalidation after a stock drop, `isStepOneComplete`, `selectableParents`) and `cards.ts`.
- Browser check: nav opens the popup on a non-custom page; stepper flow; Escape/backdrop/X close; reset and stock revalidation; mobile width.
