# Home Banners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-managed hero banner carousel on the home page: add/edit/delete/activate/drag-reorder banners with desktop and mobile images.

**Architecture:** A Supabase `home_banners` table (public read of active rows, admin write) feeds a plain-prop `HeroCarousel` via a `useHomeBanners` hook. A new `/admin/banners` page edits the rows; reordering uses `Reorder` from `motion/react` (already a dependency). Pure logic (CTA safety, ordering) lives in a tested domain file.

**Tech Stack:** Next.js 15, React 19, Tailwind 4, motion, lucide-react, Supabase JS, vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-26-home-banners-design.md`. Branch `feat/home-banners` (do not switch branches).
- No new npm dependencies. Do not apply the migration to any real database; only write the SQL file.
- CTA links must pass `isSafeCtaHref` (starts with `/` but not `//`, or `https://`) before being rendered or saved.
- `ImageCropperModal` default behavior (square, 800×800 output) must not change for existing callers; banners opt in via `aspect`.
- Square corners and `#EEEEEE` borders in admin UI, matching `CouponManager`; admin pages wrap content in `RequireAdmin` and render `AdminTabs`, like `src/app/admin/coupons/page.tsx`.
- The home page must never break because of banners: fetch errors resolve to an empty list.
- Do not touch `docs/screens/` (untracked, unrelated). Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Verify with `npm run lint` (tsc) and `npm test` before every commit.

---

### Task 1: Migration and banner domain (TDD)

**Files:**
- Create: `supabase/migrations/20260826000000_home_banners.sql`
- Create: `src/features/catalog/domain/banner.ts`
- Test: `src/features/catalog/domain/banner.test.ts`

**Interfaces:**
- Produces (from `banner.ts`):
  - `interface HomeBanner { id: string; position: number; isActive: boolean; desktopImageUrl: string; mobileImageUrl?: string; eyebrow: string; headline: string; subtext: string; ctaLabel: string; ctaHref: string; createdAt: string }`
  - `isSafeCtaHref(href: string): boolean`
  - `renumberBanners(banners: HomeBanner[]): HomeBanner[]`
  - `reorderBanners(banners: HomeBanner[], fromIndex: number, toIndex: number): HomeBanner[]`
  - `nextBannerPosition(banners: HomeBanner[]): number`

- [ ] **Step 1: Write the migration**

```sql
-- Admin-managed home page hero banners. Public can read only active rows;
-- the admin (is_admin()) can do everything. Images live in the existing
-- 'images' storage bucket under banners/.

create table home_banners (
  id uuid primary key default gen_random_uuid(),
  position int not null default 0,
  is_active boolean not null default true,
  desktop_image_url text not null,
  mobile_image_url text,
  eyebrow text not null default '',
  headline text not null default '',
  subtext text not null default '',
  cta_label text not null default '',
  cta_href text not null default '',
  created_at timestamptz not null default now()
);

alter table home_banners enable row level security;

create policy home_banners_public_select on home_banners for select using (is_active = true);
create policy home_banners_admin_all on home_banners for all using (is_admin()) with check (is_admin());
```

- [ ] **Step 2: Write the failing test** (`banner.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { isSafeCtaHref, renumberBanners, reorderBanners, nextBannerPosition, type HomeBanner } from './banner';

const make = (id: string, position: number): HomeBanner => ({
  id,
  position,
  isActive: true,
  desktopImageUrl: `${id}.jpg`,
  eyebrow: '',
  headline: id,
  subtext: '',
  ctaLabel: '',
  ctaHref: '',
  createdAt: '',
});

describe('isSafeCtaHref', () => {
  it('accepts root-relative paths and https links', () => {
    expect(isSafeCtaHref('/')).toBe(true);
    expect(isSafeCtaHref('/shop?cat=tees')).toBe(true);
    expect(isSafeCtaHref('https://example.com/x')).toBe(true);
  });

  it('rejects dangerous or ambiguous links', () => {
    expect(isSafeCtaHref('javascript:alert(1)')).toBe(false);
    expect(isSafeCtaHref('data:text/html,hi')).toBe(false);
    expect(isSafeCtaHref('//evil.com')).toBe(false);
    expect(isSafeCtaHref('http://example.com')).toBe(false);
    expect(isSafeCtaHref('')).toBe(false);
    expect(isSafeCtaHref('   ')).toBe(false);
  });
});

describe('banner ordering', () => {
  const list = [make('a', 0), make('b', 1), make('c', 2)];

  it('renumberBanners assigns positions 0..n-1 in array order', () => {
    const shuffled = [make('c', 9), make('a', 4)];
    expect(renumberBanners(shuffled).map((b) => [b.id, b.position])).toEqual([['c', 0], ['a', 1]]);
  });

  it('reorderBanners moves an item forward', () => {
    expect(reorderBanners(list, 0, 2).map((b) => [b.id, b.position])).toEqual([['b', 0], ['c', 1], ['a', 2]]);
  });

  it('reorderBanners moves an item backward', () => {
    expect(reorderBanners(list, 2, 0).map((b) => [b.id, b.position])).toEqual([['c', 0], ['a', 1], ['b', 2]]);
  });

  it('reorderBanners with same index or out-of-range from index keeps order', () => {
    expect(reorderBanners(list, 1, 1).map((b) => b.id)).toEqual(['a', 'b', 'c']);
    expect(reorderBanners(list, 7, 0).map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('reorderBanners does not mutate the input', () => {
    reorderBanners(list, 0, 2);
    expect(list.map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('nextBannerPosition is max+1, or 0 for an empty list', () => {
    expect(nextBannerPosition([])).toBe(0);
    expect(nextBannerPosition([make('a', 0), make('b', 5)])).toBe(6);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/catalog/domain/banner.test.ts`
Expected: FAIL (cannot resolve `./banner`).

- [ ] **Step 4: Implement `banner.ts`**

```ts
export interface HomeBanner {
  id: string;
  position: number;
  isActive: boolean;
  desktopImageUrl: string;
  mobileImageUrl?: string;
  eyebrow: string;
  headline: string;
  subtext: string;
  ctaLabel: string;
  ctaHref: string;
  createdAt: string;
}

// CTA links come from admin input, so only same-site paths and https URLs
// are allowed (blocks javascript:, data:, protocol-relative and plain http).
export function isSafeCtaHref(href: string): boolean {
  const value = href.trim();
  if (!value || value.startsWith('//')) return false;
  return value.startsWith('/') || value.startsWith('https://');
}

export function renumberBanners(banners: HomeBanner[]): HomeBanner[] {
  return banners.map((banner, index) => ({ ...banner, position: index }));
}

export function reorderBanners(banners: HomeBanner[], fromIndex: number, toIndex: number): HomeBanner[] {
  const next = [...banners];
  if (fromIndex >= 0 && fromIndex < next.length) {
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
  }
  return renumberBanners(next);
}

export function nextBannerPosition(banners: HomeBanner[]): number {
  return banners.length === 0 ? 0 : Math.max(...banners.map((b) => b.position)) + 1;
}
```

- [ ] **Step 5: Run tests and type-check**

Run: `npx vitest run src/features/catalog/domain/banner.test.ts && npm run lint`
Expected: PASS, tsc clean.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260826000000_home_banners.sql src/features/catalog/domain/banner.ts src/features/catalog/domain/banner.test.ts
git commit -m "feat: add home_banners table and banner domain helpers

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Repositories (public fetch and admin CRUD)

**Files:**
- Create: `src/features/catalog/infrastructure/homeBannersRepository.ts`
- Create: `src/features/admin/banners/infrastructure/bannerAdminRepository.ts`

**Interfaces:**
- Consumes: `HomeBanner`, `nextBannerPosition` from Task 1; `supabase` from `@/shared/infrastructure/supabase/client`; `uploadProductImage(storagePath, dataUrl): Promise<string>` from `@/features/admin/inventory/infrastructure/productImageUpload`.
- Produces:
  - `toBanner(row: Record<string, any>): HomeBanner` and `fetchActiveBanners(): Promise<HomeBanner[]>` (public repo)
  - `export type BannerFormPayload = Omit<HomeBanner, 'id' | 'position' | 'createdAt'>`
  - `listAllBanners(): Promise<HomeBanner[]>`, `createBanner(id: string, payload: BannerFormPayload, position: number): Promise<void>`, `updateBanner(id: string, payload: Partial<BannerFormPayload>): Promise<void>`, `deleteBanner(banner: HomeBanner): Promise<void>`, `saveBannerOrder(banners: HomeBanner[]): Promise<void>`, `uploadBannerImage(id: string, kind: 'desktop' | 'mobile', dataUrl: string): Promise<string>` (admin repo)

- [ ] **Step 1: Public repository**

```ts
import { supabase } from '@/shared/infrastructure/supabase/client';
import type { HomeBanner } from '../domain/banner';

export function toBanner(row: Record<string, any>): HomeBanner {
  return {
    id: row.id,
    position: Number(row.position) || 0,
    isActive: !!row.is_active,
    desktopImageUrl: row.desktop_image_url,
    mobileImageUrl: row.mobile_image_url ?? undefined,
    eyebrow: row.eyebrow ?? '',
    headline: row.headline ?? '',
    subtext: row.subtext ?? '',
    ctaLabel: row.cta_label ?? '',
    ctaHref: row.cta_href ?? '',
    createdAt: row.created_at ?? '',
  };
}

export async function fetchActiveBanners(): Promise<HomeBanner[]> {
  const { data, error } = await supabase
    .from('home_banners')
    .select('*')
    .eq('is_active', true)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data || []).map(toBanner);
}
```

- [ ] **Step 2: Admin repository**

```ts
import { supabase } from '@/shared/infrastructure/supabase/client';
import { uploadProductImage } from '@/features/admin/inventory/infrastructure/productImageUpload';
import { toBanner } from '@/features/catalog/infrastructure/homeBannersRepository';
import type { HomeBanner } from '@/features/catalog/domain/banner';

export type BannerFormPayload = Omit<HomeBanner, 'id' | 'position' | 'createdAt'>;

function toRow(payload: Partial<BannerFormPayload>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (payload.isActive !== undefined) row.is_active = payload.isActive;
  if (payload.desktopImageUrl !== undefined) row.desktop_image_url = payload.desktopImageUrl;
  if ('mobileImageUrl' in payload) row.mobile_image_url = payload.mobileImageUrl ?? null;
  if (payload.eyebrow !== undefined) row.eyebrow = payload.eyebrow;
  if (payload.headline !== undefined) row.headline = payload.headline;
  if (payload.subtext !== undefined) row.subtext = payload.subtext;
  if (payload.ctaLabel !== undefined) row.cta_label = payload.ctaLabel;
  if (payload.ctaHref !== undefined) row.cta_href = payload.ctaHref;
  return row;
}

export async function listAllBanners(): Promise<HomeBanner[]> {
  const { data, error } = await supabase.from('home_banners').select('*').order('position', { ascending: true });
  if (error) throw error;
  return (data || []).map(toBanner);
}

export async function createBanner(id: string, payload: BannerFormPayload, position: number): Promise<void> {
  const { error } = await supabase.from('home_banners').insert({ id, position, ...toRow(payload) });
  if (error) throw error;
}

export async function updateBanner(id: string, payload: Partial<BannerFormPayload>): Promise<void> {
  const { error } = await supabase.from('home_banners').update(toRow(payload)).eq('id', id);
  if (error) throw error;
}

export async function saveBannerOrder(banners: HomeBanner[]): Promise<void> {
  const results = await Promise.all(
    banners.map((b) => supabase.from('home_banners').update({ position: b.position }).eq('id', b.id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

// The stored object's path is derived from the public URL; failures are
// swallowed because an orphaned file is harmless and the row is already gone.
async function removeStoredImage(url: string | undefined): Promise<void> {
  const marker = '/images/';
  const index = url ? url.indexOf(marker) : -1;
  if (!url || index === -1) return;
  const path = url.slice(index + marker.length).split('?')[0];
  await supabase.storage.from('images').remove([path]);
}

export async function deleteBanner(banner: HomeBanner): Promise<void> {
  const { error } = await supabase.from('home_banners').delete().eq('id', banner.id);
  if (error) throw error;
  await Promise.allSettled([removeStoredImage(banner.desktopImageUrl), removeStoredImage(banner.mobileImageUrl)]);
}

// Same storage path is reused on re-upload (upsert), so a version query
// string busts the CDN/browser cache for the replaced image.
export async function uploadBannerImage(id: string, kind: 'desktop' | 'mobile', dataUrl: string): Promise<string> {
  const url = await uploadProductImage(`banners/${id}-${kind}`, dataUrl);
  return `${url}?v=${Date.now()}`;
}
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/features/catalog/infrastructure/homeBannersRepository.ts src/features/admin/banners/infrastructure/bannerAdminRepository.ts
git commit -m "feat: add home banner repositories

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `aspect` prop on ImageCropperModal

**Files:**
- Modify: `src/features/admin/inventory/presentation/ImageCropperModal.tsx`

**Interfaces:**
- Produces: optional prop `aspect?: number` (width ÷ height, default `1`). With the default the modal behaves and outputs exactly as before (300×300 crop window, 800×800 JPEG at quality 0.82).

For `aspect !== 1`:
- Crop window: if `aspect > 1`, `cropW = 600`, `cropH = 600 / aspect`; otherwise `cropH = 300`, `cropW = 300 * aspect`. For the default `aspect = 1` keep `cropW = cropH = 300` (use the 300 branch: `aspect <= 1`).
- Output canvas: `aspect > 1` → 1920 wide, `1920 / aspect` high; `aspect <= 1` and `aspect !== 1` → 1080 wide, `1080 / aspect` high; exactly `1` → 800×800 (unchanged).

- [ ] **Step 1: Read the whole file**, then replace the single `cropSize` constant (line ~29) with derived `cropW`/`cropH` and replace every use:
  - `baseScale` (~line 90): `Math.max(cropW / naturalDimensions.width, cropH / naturalDimensions.height)`.
  - `centerX = (cropW - displayWidth) / 2`, `centerY = (cropH - displayHeight) / 2` (both the top-level ones and the copies inside the pan-clamping helper, ~lines 98-111), and `minPanX = cropW - cX - dWidth`, `minPanY = cropH - cY - dHeight`.
  - Crop JSX style (~line 250): `style={{ width: `${cropW}px`, height: `${cropH}px` }}`.
  - Export math (~lines 184-191): `sourceWidth = cropW / currentScale`, `sourceHeight = cropH / currentScale`, and canvas size per the rules above.
  Add `aspect = 1` to the destructured props and `aspect?: number;` to `ImageCropperModalProps`. Any layout container with a hard-coded 300px width around the crop window must grow to `cropW` (check the modal's container class so the 600px window is not clipped on narrow screens: add `max-w-full` / `overflow-hidden` rather than a fixed width).

- [ ] **Step 2: Type-check and test**

Run: `npm run lint && npm test`
Expected: tsc clean, tests pass.

- [ ] **Step 3: Confirm default behavior is unchanged**

Run: `git diff src/features/admin/inventory/presentation/ImageCropperModal.tsx | grep -n "800"`
Expected: the 800×800 default path still exists. `InventoryManager.tsx` is not modified (`git status` shows only the cropper file).

- [ ] **Step 4: Commit**

```bash
git add src/features/admin/inventory/presentation/ImageCropperModal.tsx
git commit -m "feat: add optional aspect ratio to image cropper

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Storefront carousel and home wiring

**Files:**
- Create: `src/features/catalog/application/useHomeBanners.ts`
- Create: `src/features/catalog/presentation/HeroCarousel.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `HomeBanner`, `isSafeCtaHref` (Task 1); `fetchActiveBanners` (Task 2).
- Produces: `useHomeBanners(): { banners: HomeBanner[]; loading: boolean }`; `HeroCarousel` default export with props `{ banners: HomeBanner[] }`.

- [ ] **Step 1: Hook**

```ts
'use client';

import { useEffect, useState } from 'react';
import type { HomeBanner } from '../domain/banner';
import { fetchActiveBanners } from '../infrastructure/homeBannersRepository';

// A banner failure must never break the home page, so errors resolve to [].
export function useHomeBanners(): { banners: HomeBanner[]; loading: boolean } {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchActiveBanners()
      .then((rows) => !cancelled && setBanners(rows))
      .catch(() => !cancelled && setBanners([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { banners, loading };
}
```

- [ ] **Step 2: HeroCarousel**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomeBanner } from '../domain/banner';
import { isSafeCtaHref } from '../domain/banner';

const AUTO_ADVANCE_MS = 5000;
const SWIPE_THRESHOLD_PX = 40;

export default function HeroCarousel({ banners }: { banners: HomeBanner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = banners.length;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Keep the index valid when banners are added/removed (admin live preview).
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [count, paused, reducedMotion]);

  if (count === 0) return null;

  const go = (next: number) => setIndex(((next % count) + count) % count);

  return (
    <section
      className="relative w-full overflow-hidden bg-[#F0EEE9]"
      id="hero-carousel"
      aria-roledescription="carousel"
      aria-label="Featured banners"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true);
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        setPaused(false);
        if (start === null || count < 2) return;
        const delta = e.changedTouches[0].clientX - start;
        if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) go(index + (delta < 0 ? 1 : -1));
      }}
    >
      <div className="relative aspect-[4/5] sm:aspect-[16/6] w-full">
        {banners.map((banner, i) => {
          const active = i === index;
          const showCta = !!banner.ctaLabel.trim() && isSafeCtaHref(banner.ctaHref);
          return (
            <div
              key={banner.id}
              aria-hidden={!active}
              aria-roledescription="slide"
              className={`absolute inset-0 transition-opacity duration-700 ${
                active ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
              }`}
            >
              <picture>
                {banner.mobileImageUrl && <source media="(max-width: 639px)" srcSet={banner.mobileImageUrl} />}
                <img
                  src={banner.desktopImageUrl}
                  alt={banner.headline || 'Banner'}
                  className="h-full w-full object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  referrerPolicy="no-referrer"
                />
              </picture>

              {(banner.eyebrow || banner.headline || banner.subtext || showCta) && (
                <div className="absolute inset-0 flex items-end sm:items-center">
                  <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-10 sm:pb-0">
                    <div className="max-w-xl space-y-3">
                      {banner.eyebrow && (
                        <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-black">
                          {banner.eyebrow}
                        </p>
                      )}
                      {banner.headline && (
                        <h2 className="text-4xl sm:text-6xl font-black uppercase leading-[0.95] tracking-tight text-black">
                          {banner.headline}
                        </h2>
                      )}
                      {banner.subtext && (
                        <p className="text-sm sm:text-base text-black/80 leading-relaxed">{banner.subtext}</p>
                      )}
                      {showCta && (
                        <a
                          href={banner.ctaHref}
                          tabIndex={active ? 0 : -1}
                          className="inline-flex h-11 items-center bg-black px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#333333]"
                        >
                          {banner.ctaLabel}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Go to banner ${i + 1}`}
              aria-current={i === index}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-black' : 'w-2 bg-black/30'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Wire into `src/app/page.tsx`**

Add imports `useHomeBanners` from `@/features/catalog/application/useHomeBanners` and `HeroCarousel` from `@/features/catalog/presentation/HeroCarousel`. Inside `HomePage` add `const { banners } = useHomeBanners();` and render `<HeroCarousel banners={banners} />` as the first child of `<main>`, immediately above `<TrustStrip />`. Do nothing else in the file.

- [ ] **Step 4: Verify**

Run: `npm run lint && npm test`
Expected: clean, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog/application/useHomeBanners.ts src/features/catalog/presentation/HeroCarousel.tsx src/app/page.tsx
git commit -m "feat: home hero banner carousel

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Admin banner manager

**Files:**
- Create: `src/features/admin/banners/presentation/BannerForm.tsx`
- Create: `src/features/admin/banners/presentation/BannerManager.tsx`
- Create: `src/app/admin/banners/page.tsx`
- Modify: `src/features/admin/presentation/AdminTabs.tsx` (add `{ href: '/admin/banners', label: 'Banners' }` after Coupons)

**Interfaces:**
- Consumes: everything from Tasks 1-4. `ImageCropperModal` props `{ isOpen, onClose, onCropComplete(dataUrl), title, aspect }`.
- Produces: `BannerForm` props `{ initial?: HomeBanner; onSaved: () => void; onCancel: () => void; nextPosition: number }`; `BannerManager` (no props).

- [ ] **Step 1: Page** (mirrors `src/app/admin/coupons/page.tsx`, rendering `<BannerManager />`)

```tsx
'use client';

import Navbar from '@/features/catalog/presentation/Navbar';
import RequireAdmin from '@/features/auth/presentation/RequireAdmin';
import AdminTabs from '@/features/admin/presentation/AdminTabs';
import BannerManager from '@/features/admin/banners/presentation/BannerManager';

export default function AdminBannersPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <RequireAdmin>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
            <AdminTabs />
            <BannerManager />
          </div>
        </RequireAdmin>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: BannerForm**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import ImageCropperModal from '@/features/admin/inventory/presentation/ImageCropperModal';
import HeroCarousel from '@/features/catalog/presentation/HeroCarousel';
import { isSafeCtaHref, type HomeBanner } from '@/features/catalog/domain/banner';
import { createBanner, updateBanner, uploadBannerImage } from '../infrastructure/bannerAdminRepository';

interface BannerFormProps {
  initial?: HomeBanner;
  nextPosition: number;
  onSaved: () => void;
  onCancel: () => void;
}

type Target = 'desktop' | 'mobile';

const inputClass =
  'w-full border border-[#EEEEEE] bg-white px-3 py-2.5 text-sm text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none';
const labelClass = 'block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5';

export default function BannerForm({ initial, nextPosition, onSaved, onCancel }: BannerFormProps) {
  // A new banner needs its id up front so images can be uploaded to banners/<id>-*.
  const [id] = useState(() => initial?.id ?? crypto.randomUUID());
  const [desktopImageUrl, setDesktopImageUrl] = useState(initial?.desktopImageUrl ?? '');
  const [mobileImageUrl, setMobileImageUrl] = useState(initial?.mobileImageUrl ?? '');
  const [eyebrow, setEyebrow] = useState(initial?.eyebrow ?? '');
  const [headline, setHeadline] = useState(initial?.headline ?? '');
  const [subtext, setSubtext] = useState(initial?.subtext ?? '');
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? '');
  const [ctaHref, setCtaHref] = useState(initial?.ctaHref ?? '');
  const [cropTarget, setCropTarget] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const preview: HomeBanner = useMemo(
    () => ({
      id,
      position: 0,
      isActive: true,
      desktopImageUrl,
      mobileImageUrl: mobileImageUrl || undefined,
      eyebrow,
      headline,
      subtext,
      ctaLabel,
      ctaHref,
      createdAt: '',
    }),
    [id, desktopImageUrl, mobileImageUrl, eyebrow, headline, subtext, ctaLabel, ctaHref]
  );

  const handleCropped = async (dataUrl: string) => {
    const target = cropTarget;
    setCropTarget(null);
    if (!target) return;
    setBusy(true);
    setError('');
    try {
      const url = await uploadBannerImage(id, target, dataUrl);
      if (target === 'desktop') setDesktopImageUrl(url);
      else setMobileImageUrl(url);
    } catch (err: any) {
      setError(err.message || 'Image upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desktopImageUrl) {
      setError('A desktop image is required.');
      return;
    }
    if (ctaHref.trim() && !isSafeCtaHref(ctaHref)) {
      setError('Button link must start with / or https://');
      return;
    }
    setBusy(true);
    setError('');
    const payload = {
      isActive: initial?.isActive ?? true,
      desktopImageUrl,
      mobileImageUrl: mobileImageUrl || undefined,
      eyebrow: eyebrow.trim(),
      headline: headline.trim(),
      subtext: subtext.trim(),
      ctaLabel: ctaLabel.trim(),
      ctaHref: ctaHref.trim(),
    };
    try {
      if (initial) await updateBanner(id, payload);
      else await createBanner(id, payload, nextPosition);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save banner.');
    } finally {
      setBusy(false);
    }
  };

  const imageField = (label: string, target: Target, url: string, hint: string) => (
    <div>
      <span className={labelClass}>{label}</span>
      <button
        type="button"
        onClick={() => setCropTarget(target)}
        disabled={busy}
        className="flex w-full items-center gap-3 border border-dashed border-[#CFCFCF] p-3 text-left hover:border-black disabled:opacity-50"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-14 w-24 object-cover border border-[#EEEEEE]" />
        ) : (
          <ImagePlus className="h-6 w-6 text-[#919191]" />
        )}
        <span className="text-xs text-[#717171]">{url ? 'Replace image' : 'Upload image'} · {hint}</span>
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-2 border border-[#EEEEEE] p-4 sm:p-6 mb-8" id="banner-form">
      <div className="space-y-4">
        {imageField('Desktop image', 'desktop', desktopImageUrl, '16:6')}
        {imageField('Mobile image (optional)', 'mobile', mobileImageUrl, '4:5')}
        <div>
          <label className={labelClass}>Eyebrow</label>
          <input className={inputClass} value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Headline</label>
          <input className={inputClass} value={headline} onChange={(e) => setHeadline(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Subtext</label>
          <textarea className={inputClass} rows={2} value={subtext} onChange={(e) => setSubtext(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Button label</label>
            <input className={inputClass} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Button link</label>
            <input
              className={inputClass}
              placeholder="/ or https://…"
              value={ctaHref}
              onChange={(e) => setCtaHref(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={busy}
            className="h-10 bg-black px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white hover:bg-[#333333] disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Save banner'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-10 border border-[#EEEEEE] px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-[#717171] hover:text-black"
          >
            Cancel
          </button>
        </div>
      </div>

      <div>
        <span className={labelClass}>Live preview</span>
        {desktopImageUrl ? (
          <div className="border border-[#EEEEEE]">
            <HeroCarousel banners={[preview]} />
          </div>
        ) : (
          <div className="flex aspect-[16/6] items-center justify-center border border-[#EEEEEE] text-xs text-[#919191]">
            Upload a desktop image to preview
          </div>
        )}
      </div>

      <ImageCropperModal
        isOpen={cropTarget !== null}
        onClose={() => setCropTarget(null)}
        onCropComplete={handleCropped}
        title={cropTarget === 'mobile' ? 'Crop mobile banner (4:5)' : 'Crop desktop banner (16:6)'}
        aspect={cropTarget === 'mobile' ? 4 / 5 : 16 / 6}
      />
    </form>
  );
}
```

- [ ] **Step 3: BannerManager**

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Reorder } from 'motion/react';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { nextBannerPosition, renumberBanners, type HomeBanner } from '@/features/catalog/domain/banner';
import {
  deleteBanner,
  listAllBanners,
  saveBannerOrder,
  updateBanner,
} from '../infrastructure/bannerAdminRepository';
import BannerForm from './BannerForm';

export default function BannerManager() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<HomeBanner | 'new' | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setBanners(await listAllBanners());
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load banners.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Persist the order after a drag ends; on failure reload the saved order.
  const persistOrder = async (ordered: HomeBanner[]) => {
    const renumbered = renumberBanners(ordered);
    setBanners(renumbered);
    try {
      await saveBannerOrder(renumbered);
    } catch (err: any) {
      setError(err.message || 'Failed to save order.');
      await refresh();
    }
  };

  const handleToggle = async (banner: HomeBanner) => {
    try {
      await updateBanner(banner.id, { isActive: !banner.isActive });
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update banner.');
    }
  };

  const handleDelete = async (banner: HomeBanner) => {
    if (!window.confirm(`Delete banner "${banner.headline || 'Untitled'}"? This cannot be undone.`)) return;
    try {
      await deleteBanner(banner);
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete banner.');
    }
  };

  return (
    <div id="banner-manager">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-sm font-bold uppercase tracking-wider text-black">Home Banners</h1>
        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="flex h-10 items-center gap-2 bg-black px-5 text-[11px] font-bold uppercase tracking-[0.15em] text-white hover:bg-[#333333]"
          >
            <Plus className="h-4 w-4" /> Add banner
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-xs font-semibold text-red-600">{error}</p>}

      {editing !== null && (
        <BannerForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          nextPosition={nextBannerPosition(banners)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? (
        <p className="text-xs text-[#717171]">Loading…</p>
      ) : banners.length === 0 ? (
        <p className="text-xs text-[#717171]">No banners yet. Add one to show a hero carousel on the home page.</p>
      ) : (
        <>
          <p className="mb-3 text-[11px] text-[#717171]">Drag the handle to reorder. Only active banners show on the home page.</p>
          <Reorder.Group axis="y" values={banners} onReorder={setBanners} className="space-y-2">
            {banners.map((banner) => (
              <Reorder.Item
                key={banner.id}
                value={banner}
                onDragEnd={() => persistOrder(banners)}
                className="flex items-center gap-3 border border-[#EEEEEE] bg-white p-3"
              >
                <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-[#919191]" aria-label="Drag to reorder" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={banner.desktopImageUrl} alt="" className="h-12 w-28 shrink-0 border border-[#EEEEEE] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-black">{banner.headline || 'Untitled banner'}</p>
                  <p className="truncate text-xs text-[#717171]">{banner.subtext}</p>
                </div>
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#717171]">
                  <input type="checkbox" checked={banner.isActive} onChange={() => handleToggle(banner)} />
                  Active
                </label>
                <button type="button" aria-label="Edit banner" onClick={() => setEditing(banner)} className="p-2 text-[#717171] hover:text-black">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Delete banner" onClick={() => handleDelete(banner)} className="p-2 text-[#717171] hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add the tab** in `AdminTabs.tsx`: insert `{ href: '/admin/banners', label: 'Banners' },` after the Coupons entry.

- [ ] **Step 5: Verify**

Run: `npm run lint && npm test`
Expected: clean; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/banners src/app/admin/banners src/features/admin/presentation/AdminTabs.tsx
git commit -m "feat: admin banner manager with drag-and-drop reorder

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Manual verification (user-assisted)

- [ ] **Step 1:** After the user applies the migration (`supabase db push` or the Supabase SQL editor) and has `.env` configured, run `npm run dev`.
- [ ] **Step 2:** At `/admin/banners` create two banners (desktop image required, mobile optional), drag to reorder, toggle one inactive, edit and delete one.
- [ ] **Step 3:** On `/` confirm: carousel shows only active banners in order, rotates every 5s, pauses on hover, dots and swipe work, mobile (<640px) uses the mobile image, a `javascript:` CTA link is rejected in the form, zero active banners shows no carousel, and the page still works when the table does not exist (error → no carousel).
- [ ] **Step 4:** Report anything that deviates from the spec.
