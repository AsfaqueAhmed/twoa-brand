# Custom Tee Design — progress and handoff

Last updated: 2026-10-28. Branch: `feat/custom-tee-design` (pushed to `origin`, repo `AsfaqueAhmed/twoa-brand`). **Not merged to `main`, not deployed.**

## Resume on another machine

```bash
git fetch origin
git checkout feat/custom-tee-design
git pull
npm install
```

- Create `.env.local` (not in git): the Supabase URL and keys for project `kixvsiyrrmbwyqpenqqe`, plus the Firebase values the app already expects. Copy them from the other machine or from the Supabase dashboard.
- Dev server: `npm run dev` (port 3000). `.claude/launch.json` is untracked on the old machine; it only holds this config for the preview tool: `{"name":"web","runtimeExecutable":"npm","runtimeArgs":["run","dev"],"port":3000}`.
- Checks: `npx tsc --noEmit` and `npx vitest run` (491 tests pass as of the last commit).
- Try it: open the site and click **Custom Tee** in the top nav (opens the picker popup), or go straight to the studio at `/custom-tee/studio?tee=<parentId>&size=M` (a real parent id on the live data was `parent-1784789219165`).
- NOT in git and therefore not on the new machine: `.env.local`, `.superpowers/` (local task briefs and a progress ledger from the subagent workflow), and the assistant's local memory notes. The rules from those notes are copied below.

## Standing rules from the owner

- Do not merge into `main` or deploy until the owner says so. Work stays on the feature branch.
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

## What is still to do (in rough priority)

1. **Mobile studio UI.** The owner wants a separate mobile layout for the Design Studio page only. They will send a reference image. Plan: a separate component for screens under `lg`, keeping the canvas, layers, grouping, snapping and saved designs. Needs a decision on touch pan/pinch zoom (not supported today). Until then phones use the old stacked desktop layout.
2. **Phase D, commerce:** price source, Add to Cart (the button is disabled), artwork upload storage, order persistence, and the Free Gallery tab (shown disabled).
3. **Data:** only 1 of 8 parent products has an image, so only that tee appears in the picker. The other 7 need images uploaded in the admin.
4. **Admin form is untested against the real DB** (admin sign-in is Google OAuth; the form was only checked in a temporary harness). Try creating/editing a parent with several images.
5. **Deferred small items from reviews:** a second finger can disturb a drag on touch screens; opening the popup from the studio and picking another tee discards unsaved work without a warning; the Images tab is empty after a reload; saved design size wins over a newly chosen size for the same tee; opening the Layers tab with 9+ layers at a short (720px) screen clips the last rows; keyboard-only users cannot operate the canvas; multi-selection has no "mixed" value display.
6. **Merge and deploy** when the owner decides: merge to `main`, then follow the deploy procedure above. Note the images migration is already applied, so production code that predates it only writes `image`; if old code edits a parent image after the migration, run the sync SQL in the migration file's header comment.

## Where things live

- Picker popup: `src/features/customTee/presentation/` (`CustomTeeProvider`, `CustomTeeModal`, `Select`, `SelectionStepOne/Two`, `ParentCard`, `Modal`, `Stepper`, `CustomTeeLanding`); route `src/app/custom-tee/page.tsx`.
- Studio UI: `src/features/customTee/presentation/studio/` (`StudioEditor` assembles everything; `Canvas` is the pointer/zoom engine; panels: `TextInspector`, `AlignPanel`, `PositionScalePanel`, `LayersList`, `ProductPanel`, `StudioToolbar`, `ToolRail`, `DesignPanel`, `ImagesPanel`, `TextAddPanel`, `SelectionInspector`); route `src/app/custom-tee/studio/page.tsx`.
- Studio state: `src/features/customTee/application/useStudioState.ts` (multi-select, groups, per-view layers, undo history), `useCustomTeeData.ts`, `imageUpload.ts`.
- Pure, unit-tested logic: `src/features/customTee/domain/` (`layers`, `grouping`, `geometry`, `snapping`, `viewport`, `history`, `design`, `views`, `selection`, `cards`, `studioTarget`).
- Parent images: `src/features/catalog/domain/parentImages.ts`, admin `src/features/admin/parentProducts/presentation/ParentImagesField.tsx`, repositories `firestoreParentProductsRepository.ts` (read) and `firestoreParentProductsAdminRepository.ts` (write; falls back to the single-image write if the `images` column is missing).
- Navbar entry: `src/features/catalog/presentation/Navbar.tsx` (Custom Tee tab, desktop and mobile bar).

## Specs and plans

- One living spec: `docs/superpowers/specs/2026-10-28-custom-tee-design-design.md` (phase A picker, Phase B parent images, Phase C studio, C2 controls, fit-to-screen).
- Implementation plans: `docs/superpowers/plans/2026-10-28-custom-tee-design.md` (picker, phase A), `...-custom-tee-popup.md`, `...-design-studio.md`, `...-parent-images.md`, `...-studio-controls.md`.

## Conventions used in this work

- Studio and popup style: black and white, 8px radius (`rounded-lg`), borders `#EEEEEE`, muted text `#717171`, buttons `text-[11px] font-bold uppercase tracking-widest`. The admin keeps its own sharp-corner style.
- Layer coordinates are fractions of the canvas; saved designs live in `sessionStorage['custom-tee-design']` as `layersByView` (view ids `view-0`, `view-1`, ...); the selected tee hand-off is `sessionStorage['custom-tee-selection']` plus `?tee=&size=` query params.
- Browser testing tip: with the preview tool, set an explicit viewport (e.g. 1440x900); plain wheel-pan only works at `lg` (>=1024px) widths.
