# Custom Tee Design — Phase 1 (selection + Design Studio)

## Scope

Customer-facing `/custom-tee` flow: pick a base tee via four dependent selections, then design it in a Design Studio.
Section "Parent Product / Product classification" of the original brief is **already implemented** (parent category/subcategory required; products inherit them) and is out of scope.

**Out of scope (to-do, later phase):** pricing, artwork upload storage, cart/order persistence, `OrderItem` changes, any stock deduction or reservation.

## Data

- No schema change, no migration.
- Eligibility comes from existing `ParentProduct` (`category`, `subcategory`, `sizeOrder`, `stockBySize`), loaded via `fetchAllParentProducts`.
- Card extras derived from products linked by `parentProductId`:
  - Photos: parent `image` + linked products' `image`/`gallery`.
  - Colors: union of linked products' `variants` (name, colorCode, image).
  - SKU: not stored on parents; card shows a short code derived from the parent id.
- Category/subcategory list: existing categories repository, restricted to those with at least one eligible parent.
- Eligible = `stockBySize[size] > 0`.

## Structure (`src/features/customTee/`)

- `domain/selection.ts` (pure, unit tested)
  - `eligibleCategories(parents)`, `eligibleSubcategories(parents, category)`, `eligibleSizes(parents, category, sub)`, `eligibleParents(parents, category, sub, size)`
  - `validateSelection(parents, selection)` → `{ ok } | { ok: false, resetTo: 'category'|'subcategory'|'size'|'parent', reason }`
  - `setCategory/setSubcategory/setSize` reducers: changing a step clears every later step.
- `domain/design.ts`: `Design = { parentProductId, size, colorName?, artwork?: { x, y, scale } }` with normalized (0–1) placement; artwork file held client-side as an object URL.
- `application/useCustomTeeSelection.ts`: loads parents/products/categories, holds selection state, revalidates against fresh stock.
- `presentation/SelectionWizard.tsx`, `ParentCard.tsx`, `DesignStudio.tsx`, `ArtworkControls.tsx`.
- `src/app/custom-tee/page.tsx`: thin route.

## Behavior

1. Category dropdown → Subcategory (only those with eligible parents) → Size (only sizes with stock among matches) → image cards (photo, name, short code, colors, "Size M: N pcs").
2. Selecting a card updates a preview panel (primary image with gallery thumbnails).
3. **Continue to Design Studio** is hidden until all four selections validate.
4. Empty states: no subcategories for the category; no sizes with stock; no matching parents (message, not an empty grid).
5. Stock is re-fetched when the studio opens and on Save. If the size/parent is no longer eligible, the user is returned to the affected step with a message. Selecting a tee never changes stock.
6. Studio: large front-view preview on the chosen parent/variant image; artwork upload (image types, size cap); drag to position; scale slider; color switcher over available variants; Save and continue.
7. Save and continue stores the `Design` in `sessionStorage` (linked to `parentProductId` + size) and shows a saved-design summary with a clearly marked placeholder for the future "Add to cart" step.

## Testing

- Vitest for `domain/selection.ts` (cascading resets, stock-0 exclusion, empty cases, revalidation after stock drop) and `design.ts` (placement clamping).
- Browser check of the full flow at mobile and desktop widths.
