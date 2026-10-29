# Custom Tee Design — progress and handoff

Last updated: 2026-10-29. Repo `AsfaqueAhmed/twoa-brand`. **The Custom Tee work is merged into `main`** (merge `efa41c7` of `feat/custom-tee-design-antigravity`, plus Suspense fix `4949ab2`). **Deployment status is unknown. Check what is live before assuming either way** (a nightly workflow rebuilds from the repo and redeploys, so `main` may go live without a manual deploy).

## Resume on another machine

```bash
git fetch origin
git checkout main        # or a feature branch cut from main
git pull
npm install
```

- Create `.env.local` (not in git): the Supabase URL and keys for project `kixvsiyrrmbwyqpenqqe`, plus the Firebase values the app already expects. Copy them from the other machine or from the Supabase dashboard.
- Dev server: `npm run dev` (port 3000). `.claude/launch.json` is untracked on the old machine; it only holds this config for the preview tool: `{"name":"web","runtimeExecutable":"npm","runtimeArgs":["run","dev"],"port":3000}`.
- Checks: `npx tsc --noEmit` and `npx vitest run` (495 tests pass on `main` as of 2026-10-29).
- Try it: open the site and click **Custom Tee** in the top nav (opens the picker popup), or go straight to the studio at `/custom-tee/studio?tee=<parentId>&size=M` (phones are redirected to `/custom-tee/studio/mobile`) (a real parent id on the live data was `parent-1784789219165`).
- NOT in git and therefore not on the new machine: `.env.local`, `.superpowers/` (local task briefs and a progress ledger from the subagent workflow), and the assistant's local memory notes. The rules from those notes are copied below.

## Standing rules from the owner

- Do not merge into `main` or deploy until the owner says so (the owner merged the custom tee work into `main` on 2026-10-29). New work goes on a feature branch.
- Back up the database before applying any migration. There is one Supabase project (`kixvsiyrrmbwyqpenqqe`) shared by local dev and production. Backups are `backup_*` tables in the `public` schema with RLS enabled (no policies), e.g. `backup_parent_products_20261028_images`.
- Deploy procedure (when asked): stop the dev server, `source .env.local`, export `NEXT_PUBLIC_META_PIXEL_ID` from `gh variable get ... --repo AsfaqueAhmed/twoa-brand`, `rm -rf .next out && npm run build`, `firebase deploy --only hosting --project twoa-brand`. Push `main` first, because a nightly workflow rebuilds from the repo.

## What is done

| Phase | What | State |
| --- | --- | --- |
| A | Picker popup: Category and size, then Choose tee, opened from the nav **Custom Tee** tab over any page. `/custom-tee` is a landing page that opens it. Only parents with an image and stock appear. Continue re-checks stock and navigates to the studio. | Done |
| B | Parent products have multiple titled images (`parent_products.images` jsonb, `image` mirrors the first). Admin Images list on the parent form. The studio view tabs come from these images, and layers are per view. | Done. Migration `20261028000300_parent_product_images.sql` was **applied to the live DB** after a backup |
| C | Design Studio at `/custom-tee/studio`: image and text layers, undo/redo, align/flip/scale, zoom, save and restore (sessionStorage). | Done |
| C2 | Figma/Canva-style controls: smart-guide snapping, multi-select and marquee, flat groups (Cmd+G), on-canvas text editing, richer text, selection-aware Properties panel, pan/zoom with a 25% visibility limit. Opacity was removed at the owner's request. | Done |
| UI | Fit-to-screen editor on desktop (no scrolling), Layers above Properties, thin selection lines. | Done |
| Mobile | Dedicated Mobile Design Studio (`/custom-tee/studio/mobile`), decoupled presentation components in `presentation/mobile/`, drawer bottom sheets (Add Design, Free Gallery, Text with Bengali fonts, Design Settings, Layers), touch stage, and desktop auto-redirect. | Done |

## What is still to do (in rough priority)

1. **Deployment:** confirm whether `main` is live. If a deploy is wanted, follow the deploy procedure above. Remember the nightly workflow may publish `main` on its own.
2. **Admin images form is untested against the real DB** (admin sign-in is Google OAuth; the form was only checked in a temporary harness). Create or edit a parent with several images while signed in.
3. **Mobile studio needs a real-device pass.** It was built outside the assistant sessions and has not been reviewed or tested by the assistant: check the picker popup, the desktop-to-mobile redirect, touch drag/scale/rotate, snapping, saving and restoring.
4. **Phase D, commerce:** price source, Add to Cart (the button is disabled), artwork upload storage, order persistence. Free Gallery: the desktop tab is still disabled while mobile has a curated gallery; decide whether to align them.
5. **Data:** only 1 of 8 parent products has an image, so only that tee appears in the picker. The other 7 need images uploaded in the admin.
6. **Deferred small items from reviews:** a second finger can disturb a drag on touch screens; opening the popup from the studio and picking another tee discards unsaved work without a warning; the Images tab is empty after a reload; saved design size wins over a newly chosen size for the same tee; opening the Layers tab with 9+ layers at a short (720px) screen clips the last rows; keyboard-only users cannot operate the canvas; multi-selection has no "mixed" value display.
7. **Housekeeping:** `feat/custom-tee-design` (remote) and `feat/custom-tee-design-antigravity` are now redundant because `main` contains everything; delete or archive them when no longer needed. Note the images migration is already applied to the live DB, so production code that predates it only writes `image`; if old code edits a parent image after the migration, run the sync SQL in the migration file's header comment.

## Where things live

- Picker popup: `src/features/customTee/presentation/` (`CustomTeeProvider`, `CustomTeeModal`, `Select`, `SelectionStepOne/Two`, `ParentCard`, `Modal`, `Stepper`, `CustomTeeLanding`); route `src/app/custom-tee/page.tsx`.
- Studio UI: `src/features/customTee/presentation/studio/` (`StudioEditor` assembles everything; `Canvas` is the pointer/zoom engine; panels: `TextInspector`, `AlignPanel`, `PositionScalePanel`, `LayersList`, `ProductPanel`, `StudioToolbar`, `ToolRail`, `DesignPanel`, `ImagesPanel`, `TextAddPanel`, `SelectionInspector`); route `src/app/custom-tee/studio/page.tsx`.
- Studio state: `src/features/customTee/application/useStudioState.ts` (multi-select, groups, per-view layers, undo history), `useCustomTeeData.ts`, `imageUpload.ts`.
- Pure, unit-tested logic: `src/features/customTee/domain/` (`layers`, `grouping`, `geometry`, `snapping`, `viewport`, `history`, `design`, `views`, `selection`, `cards`, `studioTarget`).
- Parent images: `src/features/catalog/domain/parentImages.ts`, admin `src/features/admin/parentProducts/presentation/ParentImagesField.tsx`, repositories `firestoreParentProductsRepository.ts` (read) and `firestoreParentProductsAdminRepository.ts` (write; falls back to the single-image write if the `images` column is missing).
- Navbar entry: `src/features/catalog/presentation/Navbar.tsx` (Custom Tee tab, desktop and mobile bar).
- Mobile studio: `src/features/customTee/presentation/mobile/` (editor, canvas, bottom sheets under `sheets/`), route `src/app/custom-tee/studio/mobile`; shared font catalog in `src/features/customTee/domain/fonts.ts` with `application/fontLoader.ts`; saved-design prompt `presentation/SavedDesignChoice.tsx`.

## Specs and plans

- One living spec: `docs/superpowers/specs/2026-10-28-custom-tee-design-design.md` (phase A picker, Phase B parent images, Phase C studio, C2 controls, fit-to-screen).
- Implementation plans: `docs/superpowers/plans/2026-10-28-custom-tee-design.md` (picker, phase A), `...-custom-tee-popup.md`, `...-design-studio.md`, `...-parent-images.md`, `...-studio-controls.md`.

## Conventions used in this work

- Studio and popup style: black and white, 8px radius (`rounded-lg`), borders `#EEEEEE`, muted text `#717171`, buttons `text-[11px] font-bold uppercase tracking-widest`. The admin keeps its own sharp-corner style.
- Layer coordinates are fractions of the canvas; saved designs live in `sessionStorage['custom-tee-design']` as `layersByView` (view ids `view-0`, `view-1`, ...); the selected tee hand-off is `sessionStorage['custom-tee-selection']` plus `?tee=&size=` query params.
- Browser testing tip: with the preview tool, set an explicit viewport (e.g. 1440x900); plain wheel-pan only works at `lg` (>=1024px) widths.

## Quote flow (phase D) — branch `feat/custom-tee-quotes` (not pushed, not merged)

- Customers press **Request a quote** in the studio (desktop and mobile); admin works in **Custom Quotes**, sets sizes, price per piece and expiry, and sends a one-time link `/custom-order?token=...`; the customer places a COD order; admin downloads a ZIP of the design from the quote or order.
- Spec `docs/superpowers/specs/2026-10-29-custom-tee-quotes-design.md`, plan `docs/superpowers/plans/2026-10-29-custom-tee-quotes.md`.
- **Migration `20261029000000_custom_tee_quotes.sql` was APPLIED to the live DB on 2026-10-29** after a dry run and a backup (`backup_orders_20261029_quotes`, `backup_parent_product_size_stock_20261029_quotes`). Live code on `main` does not yet use it, so nothing breaks.
- Whole-branch review findings were fixed in `810fbb6`.
- Still to test by hand (needs an admin session): submit a quote in the studio, price it in the admin (`set_custom_quote_pricing` is untested), open the link, place the order, download the ZIP from the quote and the order. Also check the base tee image CORS for preview rendering.
- Remove test quote and order rows after testing.

### Combined designs (bundles) and "Order now"

- The studio button is now **Order now** (filled); Save is outlined.
- An admin can combine several quotes from the same customer (same last 10 phone digits) into one checkout link and one order: Custom Quotes, open the main quote, **Combine with other designs**. Each design is priced on its own first. The order has one line per design and size; the order screen shows one Download design ZIP per design.
- Migration `20261029000100_custom_quote_bundles.sql` was **APPLIED to the live DB on 2026-10-29** after a dry run and backups (`backup_orders_20261029_bundles`, `backup_parent_product_size_stock_20261029_bundles`, `backup_custom_quotes_20261029_bundles`).
- Still to check by hand as admin: the Combine section, the combined checkout page and the per-design ZIP downloads.

### Free Gallery (admin-managed)

- Admin **Gallery** page (`/admin/gallery`, after Banners) uploads and manages artwork (title, category, sort order, hide/show, delete). Both studios read the same active rows: mobile Free Gallery sheet and the desktop Free Gallery tab. The old built-in drawn SVG gallery was removed, so it starts empty until artwork is uploaded.
- Migration `20261029000200_gallery_artworks.sql` was **APPLIED to the live DB on 2026-10-29** (table `gallery_artworks`, public bucket `gallery`, admin-only writes) after a dry run and backups (`backup_orders_20261029_gallery`, `backup_custom_quotes_20261029_gallery`).
- Checked in the browser: both studios show the "No artwork yet" empty state. Still to check as admin: upload an image, see it in both studios, add it to a design and send an Order now request. Studio visitors see changes after a page reload (first fetch is cached).
