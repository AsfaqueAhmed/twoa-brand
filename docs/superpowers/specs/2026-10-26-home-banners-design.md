# Home Banners (Backend-Managed Hero Carousel) — Design

Date: 2026-10-26
Branch: `feat/home-banners` (branched from `feat/home-redesign`, which is not yet merged)
Sub-project 2 of the home page work. Follows `2026-10-26-home-redesign-design.md`.

## Scope

Admins add, edit, reorder (drag and drop), activate and delete banner blocks. The storefront shows active banners as an auto-rotating hero carousel above the trust strip.

**In scope**
- `home_banners` table, RLS, and storage under the existing `images` bucket.
- `HeroCarousel` storefront component and `useHomeBanners` hook.
- Admin tab `/admin/banners` with drag-and-drop reorder, edit form, live preview.
- Optional `aspect` prop on `ImageCropperModal` (default square, so inventory screens are unchanged).

**Out of scope**
- Making the trust strip or product grid draggable blocks; free-form page builder.
- Scheduling/expiry, analytics, per-banner variants.

## Data

`home_banners` (new migration `supabase/migrations/20260826000000_home_banners.sql`):

| column | type | notes |
|---|---|---|
| id | uuid pk default gen_random_uuid() | |
| position | int not null default 0 | display order, ascending |
| is_active | boolean not null default true | |
| desktop_image_url | text not null | |
| mobile_image_url | text | nullable; falls back to desktop |
| eyebrow | text not null default '' | |
| headline | text not null default '' | |
| subtext | text not null default '' | |
| cta_label | text not null default '' | |
| cta_href | text not null default '' | |
| created_at | timestamptz not null default now() | |

RLS enabled. `home_banners_public_select` for select using `is_active = true`; `home_banners_admin_all` for all using `is_admin()` with check `is_admin()` (same `is_admin()` function as other tables). Images are uploaded to the `images` bucket under `banners/<id>-desktop` and `banners/<id>-mobile` via the existing `uploadProductImage`; no storage policy changes.

Applying the migration to the real Supabase project is a separate, user-approved step (not done by implementation tasks).

## Storefront

- `useHomeBanners()` (catalog application layer) fetches active banners ordered by `position` and returns `{ banners, loading }`. A fetch error yields an empty list (home page must never break because of banners).
- `HeroCarousel({ banners })` — plain-prop component, no fetching:
  - 0 banners: renders nothing. 1 banner: no dots, no rotation.
  - 2+: auto-advance every 5s; pauses on hover/touch/focus; dots; swipe on touch; honors `prefers-reduced-motion` (no auto-advance).
  - Each slide: `<picture>` with mobile image for widths under 640px, otherwise desktop. First slide `loading="eager"`, others `lazy`.
  - Text overlay (eyebrow, headline, subtext, one CTA button) left-aligned; each part rendered only if non-empty. CTA rendered only if `isSafeCtaHref(cta_href)` and label non-empty.
- `app/page.tsx` renders `HeroCarousel` above `TrustStrip`. While loading, nothing is rendered in the carousel's place (no layout skeleton in v1).

## Admin

- Route `/admin/banners`, tab "Banners" in `AdminTabs`, wrapped in `RequireAdmin` like the other admin pages.
- `BannerManager`: list in a `Reorder.Group` from `motion/react` (no new dependency). Row: drag handle, thumbnail, headline, active toggle, edit, delete. On drop, `reorderBanners` computes new positions and they are persisted; failure reverts the list and shows an error.
- Edit form fields: desktop image (crop 16:6), mobile image optional (crop 4:5), eyebrow, headline, subtext, CTA label, CTA link. Side-by-side live preview using `HeroCarousel` with the draft. Save validates: desktop image required; CTA link, if set, must pass `isSafeCtaHref`.
- Delete asks `window.confirm`, deletes the row, then best-effort removes stored images.
- `ImageCropperModal` gets `aspect?: number` (width/height, default 1): crop window width stays 300px for aspect ≤ 1, otherwise width 600px (height = width / aspect); the output canvas keeps the same ratio (square 800×800 default; wide banners 1920 wide; portrait 4:5 at 1080 wide).

## Domain (pure, unit-tested)

- `src/features/catalog/domain/banner.ts`: `HomeBanner` type, `isSafeCtaHref(href: string): boolean` (true only for strings starting with `/` but not `//`, or `https://`), `reorderBanners(banners: HomeBanner[], fromIndex: number, toIndex: number): HomeBanner[]` (returns a new array with the item moved and `position` reassigned 0..n-1; out-of-range `fromIndex` returns a renumbered copy), `renumberBanners(banners: HomeBanner[]): HomeBanner[]` (positions reassigned 0..n-1; used to persist the array `Reorder.Group` hands back), `nextBannerPosition(banners: HomeBanner[]): number`.

## Infrastructure

- `src/features/catalog/infrastructure/homeBannersRepository.ts`: `fetchActiveBanners()` (public).
- `src/features/admin/banners/infrastructure/bannerAdminRepository.ts`: `listAllBanners`, `createBanner`, `updateBanner`, `deleteBanner`, `saveBannerOrder`, `uploadBannerImage`.
- Row↔domain mapping in one `toBanner` function shared by both repositories (exported from the public repository).

## Testing

- Vitest: `isSafeCtaHref` (accepts `/shop`, `https://x.com`; rejects `javascript:`, `//evil.com`, `http://`, empty), `reorderBanners` (move forward/back, same index, positions renumbered), `nextBannerPosition`.
- `npm run lint` and `npm test` pass.
- Manual (needs Supabase env): upload, reorder, toggle, delete a banner; carousel responds; mobile uses mobile image.

## Risks
- No browser/Supabase env in the dev sandbox: UI and RLS behavior need a manual pass by the user after the migration is applied.
- `is_admin()` is hard-coded to one email in the existing schema; the new policies inherit that.
