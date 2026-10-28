# Custom Tee Design — Phase A (selection picker)

## Roadmap (one spec per phase)

- **A. Picker (this spec):** `/custom-tee` four-step selection, ends at a hand-off screen.
- **B. Parent view images (spec below, "Phase B"):** admin uploads multiple titled images on a Parent Product (migration + admin UI + `ParentProduct` type); the studio views come from them.
- **C. Design Studio (spec below, "Phase C"):** the reference layout (left tool rail, canvas, right panel): image + text layers, layers list (visibility, reorder), position/scale/align/flip, undo/redo, zoom/fullscreen. Front view only until phase B; the view tabs render from a `views` list that phase B extends.
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
- `presentation/`: `Modal` (generic dialog shell), `Select` (white custom dropdown), `Stepper`, `SelectionStepOne`, `SelectionStepTwo`, `ParentCard`, `CustomTeeModal` (orchestration), `CustomTeeProvider` (+ `useCustomTee`), `CustomTeeLanding`.
- `src/app/custom-tee/page.tsx`: thin route rendering the landing page.

## Behavior (popup)

The picker is a fixed-width (640px on desktop) modal, identical width for both steps with a height that follows the content and animates between steps, styled like the storefront (8px corners, white panels, uppercase tracking buttons); bottom sheet on phones with a close button, dimmed backdrop, Escape / backdrop-click to close, and body scroll locked while open. A two-step stepper sits at the top.

1. **Step 1, Category & size:** Category -> Subcategory (only those with eligible parents) -> Size (only sizes with stock among matches). **Next** appears only when `isStepOneComplete`.
2. **Step 2, Choose tee:** a 4-per-row gallery that shows 2.5 rows and scrolls; image cards (parent image, name, SKU code, colors, "Size M: N pcs"), **Back** to step 1, and **Continue to Design Studio** once a card is selected (`isComplete`).
3. Only parents with a non-empty image are shown; cards use the parent image only.
4. Empty states: no subcategories; no sizes with stock; no matching parents.
5. On Continue, inputs lock, stock is re-fetched and the selection revalidated. If invalid, the selection is truncated, a notice is shown, and the user returns to step 1 (or stays on step 2 if only the tee became unavailable). Selecting never changes stock.
6. On success, `sessionStorage['custom-tee-selection']` = `{ parentProductId, size }` and the modal shows a "Tee selected" summary (placeholder for the phase C studio) with Change tee / Close.
7. **Opening:** the "Custom Tee" nav tab (desktop and mobile bar) opens the modal over the current page via `useCustomTee().open()`. `/custom-tee` renders a simple landing page that opens the modal on mount, so direct links work; closing it leaves the landing page. Closing discards in-modal selection state.

## Testing

- Vitest for `selection.ts` (cascading resets, stock-0 exclusion, canonical size order, empty cases, revalidation after a stock drop, `isStepOneComplete`, `selectableParents`) and `cards.ts`.
- Browser check: nav opens the popup on a non-custom page; stepper flow; Escape/backdrop/X close; reset and stock revalidation; mobile width.

---

# Phase C: Design Studio

## Scope

A full page `/custom-tee/studio` (under the site navbar), matching the approved reference: left tool rail + tool panel, center canvas, right product/controls panel. Front view only: the Front/Back/Left/Right tabs and thumbnails render from `buildViews()`, which returns only the front view today (parent image, or the selected color variant's image). Phase B later adds the other views.

**Out of scope (shown as "coming soon", not faked):** Free Gallery tab (phase D), price and Add to Cart (phase D). **Not built:** a Settings tab. Phase B (view images, migration) is separate.

## Entry and exit

- The popup's Continue navigates to `/custom-tee/studio?tee=<parentId>&size=<size>` (and still writes `sessionStorage['custom-tee-selection']`). The studio reads the query params first, then the sessionStorage hand-off.
- The studio loads parents via `useCustomTeeData`, and `resolveStudioTarget` requires an imaged parent with stock > 0 in that size. If there is no hand-off or the target is invalid it redirects to `/custom-tee` (which opens the popup).
- A saved design (`sessionStorage['custom-tee-design']`) for the same parent is restored (layers, color, size).

## Layers (domain, pure and tested)

- `Layer` = image (`src` data URL, `aspect`) or text (`text` <= 60 chars, `fontFamily` from a fixed list, `color` hex). Common: `id`, `name`, `x`,`y` (center, 0..1 of the canvas), `scale` (image width as a fraction of canvas width; text font size = `scale * 0.2 * canvasWidth`), `rotation` (deg, normalized to (-180,180]), `flipX`, `flipY`, `visible`. Array order = z-order (last = top).
- Operations: add, remove, update (clamped: scale 0.05..1.5, x/y 0..1), toggle visibility, flip, move up/down, reorder, align (left/center/right/top/middle/bottom using the layer's measured box).
- Undo/redo: a generic `History<T>` (limit 50) with `live` (drag in progress, no history entry), `settle` (a finished gesture becomes one undo step), `commit` (discrete change), `undo`, `redo`.
- Displayed scale percent: `scale / 0.4 * 100` (default layer = 100%).

## Canvas and tools

- Canvas is DOM-based (an `<img>` base plus absolutely positioned layers), not the canvas API. Drag to move; corner handles scale from the layer center; a top handle rotates. Click empty canvas to deselect. Delete removes the selected layer; Ctrl/Cmd+Z undo, Shift+Ctrl/Cmd+Z redo (ignored while typing in a field).
- Zoom 50%-200% in 25% steps changes the canvas width; fullscreen uses the Fullscreen API on the studio root.
- Design tab: upload (PNG/JPG/WebP, max 10 MB; drag-and-drop or click; multiple files). Images are downscaled to max 1600px and stored as data URLs. Images tab: uploaded asset library (click adds another layer). Text tab: add text, font (white custom dropdown), color; edits the selected text layer. Layers tab: the same layers list as the right panel.
- Right panel: product card (parent name, SKU code, category/subcategory), Color swatches (from linked product variants; selecting one swaps the base image when the variant has an image), Size buttons (sizes with stock), Design Layers list (select, show/hide, delete, drag-to-reorder + up/down), Position & Scale (align x6, flip x2, scale slider + % box; disabled with no selection), Save Design, a disabled "Add to Cart (coming soon)".
- No footer strip on the studio page.

## Save

Save re-fetches stock and checks the chosen size is still eligible; on success it stores the design (`parentProductId`, `size`, `colorName`, `layers`) in `sessionStorage` (also refreshing the hand-off) and shows "Design saved for this session". Storage quota errors show a clear message. Nothing writes stock.

## Structure

- `domain/history.ts`, `domain/layers.ts`, `domain/design.ts`, `domain/studioTarget.ts`, `domain/views.ts` (all pure, tested).
- `application/imageUpload.ts` (`fileToDataUrl`), `application/useStudioState.ts`.
- `presentation/studio/`: `Canvas`, `StudioToolbar`, `ToolRail`, `DesignPanel`, `ImagesPanel`, `TextPanel`, `LayersList`, `ProductPanel`, `PositionScalePanel`, `StudioEditor`, `StudioPage`; route `src/app/custom-tee/studio/page.tsx`.

## Testing

Vitest for the five domain modules. Browser check: load from the popup, upload, drag/scale/rotate, text, layers (hide/reorder/delete), align/flip, undo/redo, zoom, save + reload restore, invalid hand-off redirect, stock-gone on Save, narrow width.

---

# Phase B: Multiple titled parent images

## Data

- New additive column `parent_products.images jsonb not null default '[]'`: ordered `[{ "title": string, "url": string }]`. The existing `image` column stays and always mirrors the first image's URL (the admin save writes both), so the popup picker, cards, storefront and `selectableParents` are unchanged. The migration backfills `[{ "title": "Front", "url": image }]` where `image <> ''`.
- `ParentProduct` gains optional `images?: ParentImage[]` (`ParentImage = { title: string; url: string }`). `getParentImages(parent)` returns `images`, or falls back to the single `image` as `Front`, so nothing breaks before the migration is applied (reads use `select *`).
- Rules (`sanitizeParentImages`): trim; drop blank and duplicate URLs; max 8; title max 40 chars; blank titles become `Image N` (by position).
- The migration file is written but NOT applied until the user says so (take a DB backup first).
- **Deploy order:** apply the migration and deploy this code together. Any `image` edit made by older code between the migration and the deploy leaves `images` stale (the reader prefers `images`); run the sync `update` from the top of the migration file right before/at deploy (it only touches rows with 0 or 1 images).

## Admin (Parent Products form)

The single Image field becomes an **Images** list: each row has a thumbnail, a title input (free text, datalist suggestions Front/Back/Left/Right), move up/down and remove; row 1 is badged "Primary". Below the list: paste-URL add, and "Upload & Crop" (existing cropper, one image per upload). New images get the first unused suggested title. Max 8. Saving writes `images` and `image = images[0].url`.

## Studio (views and per-view layers)

- `buildViews(parent, color)` returns one view per image: `id = "view-<index>"`, `label = title`, `image = url` (the first view uses the selected color variant's image when it has one).
- Layers are **per view**. `useStudioState(initialLayersByView, viewId)` holds `Record<viewId, Layer[]>` in one undo history; all edit operations apply to the active view. Switching views clears nothing; the selection is naturally per view.
- `StudioDesign` stores `layersByView`. `parseDesign` also accepts the legacy `layers` array and loads it into `view-0`. View keys must match `view-<digits>`; ids are validated and de-duplicated per view; empty views are not saved.

---

# Phase C2: Figma/Canva-style studio controls

Black-and-white styling is unchanged (guides are black lines with a white outline). Floating toolbar, duplicate/copy-paste and a print-area guide are out of scope.

## Panels

- **Left Text tab only adds text:** "Add a heading", "Add a subheading", "Add body text" presets. It never shows editing fields for a selected layer.
- **Right bar = selection-aware Properties** (below the Design Layers list, shown only with a selection): text layer -> content, font, size, bold, italic, align, letter spacing, color; image layer -> layer name only; 2+ layers or a group -> group/ungroup, delete. For any selection: Align (and Distribute when 3+ units). A single layer also gets Flip and Scale.

## Layer model additions

- All layers: optional `groupId`. Text: `bold`, `italic`, `align` (left|center|right, default center), `letterSpacing` (em, -0.05..0.5, default 0); text may be multi-line, max 200 chars. Older designs load with defaults.
- **Groups are flat:** layers sharing a `groupId` (>= 2 members, contiguous in the stack). Clicking a member selects the whole group; double-click selects just that member. Group/ungroup: Cmd/Ctrl+G, Cmd/Ctrl+Shift+G. A group moves, scales and rotates as one unit (scale/rotate about the group's bounding box center; members keep relative placement). Stack "units" (a group or a lone layer) are what the layers list reorders.
- Selection state is `selectedIds`. Marquee, shift/cmd-click and Cmd/Ctrl+A build it; whole groups are always selected together except via double-click.

## Canvas behavior

- Snapping while dragging: the selection's bounding box edges/center snap to canvas edges/center and other layers' edges/centers within 6 screen px, with black guide lines; Alt disables. Rotation snaps to 15 degree multiples within 4 degrees (Shift forces). A small readout shows angle or scale percent while rotating/scaling.
- Align: one unit aligns to the canvas; 2+ units align to the selection's bounds; Distribute needs 3+ units (equal gaps, first/last fixed).
- Text: double-click a text layer to edit in place (textarea overlay). Click away commits; Escape cancels; Enter adds a line.
- Viewport: wheel pans, Ctrl/Cmd+wheel (and trackpad pinch) zooms about the cursor, Space+drag or middle-drag pans; zoom 25%-400%; Fit button; clicking the percent resets to 100%.
- Arrow keys nudge the selection 1 px (Shift 10 px); Delete removes; Escape clears the selection.
- Limits: moving, scaling or rotating a group stops at the canvas edge / the scale limits as a whole (members keep their relative spacing) instead of distorting it.
- Hidden layers are never selected (hiding a layer removes it from the selection); the selection also clears when the active view changes.
- Double-click isolates a single member of a group: it gets no handles, and Ungroup ungroups the whole group. Clicking a member row in the layers list selects just that member.
- In-place text editing is limited to 200 characters.
- On narrow (touch) layouts the canvas does not capture page scroll (a plain wheel scrolls the page); there is no pinch-zoom or touch pan, so use the zoom buttons.
- Panning (and zooming) can never move the product out of view: at least 25% of the tee image stays inside the canvas on both axes.
