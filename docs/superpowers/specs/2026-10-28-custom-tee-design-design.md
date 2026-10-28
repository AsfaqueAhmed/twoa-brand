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

- `domain/selection.ts` (pure, tested): `eligibleCategories/Subcategories/Sizes/Parents`, `selectCategory/Subcategory/Size/Parent` reducers (each clears later steps), `isComplete`, `validateSelection`.
- `domain/cards.ts` (pure, tested): `buildParentCard`.
- `application/useCustomTeeData.ts`: loads parents + products; `refreshParents()` re-reads stock.
- `presentation/`: `ParentCard`, `SelectionWizard`, `CustomTeeFlow`.
- `src/app/custom-tee/page.tsx`: thin route.

## Behavior

1. Category → Subcategory (only those with eligible parents) → Size (only sizes with stock among matches) → image cards (photo, name, SKU code, colors, "Size M: N pcs").
2. Selecting a card updates a preview panel showing the parent's image. Parents without an image are never listed and never make a category, subcategory or size selectable.
3. **Continue to Design Studio** is hidden until all four selections validate.
4. Empty states: no subcategories; no sizes with stock; no matching parents.
5. On Continue, stock is re-fetched and the selection revalidated. If invalid, the user stays on the picker, later steps are cleared and a message is shown. Selecting never changes stock.
6. On success, `sessionStorage['custom-tee-selection']` = `{ parentProductId, size }` and a hand-off screen summarizes the choice with a placeholder for the phase C studio.

## Testing

- Vitest for `selection.ts` (cascading resets, stock-0 exclusion, canonical size order, empty cases, revalidation after a stock drop) and `cards.ts`.
- Browser check of the flow at mobile and desktop widths.
