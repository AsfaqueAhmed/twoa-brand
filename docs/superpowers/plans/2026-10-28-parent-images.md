# Multiple Titled Parent Images (Phase B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins attach multiple titled images to a Parent Product, and make the Design Studio's views (with per-view layers) come from those images.

**Architecture:** A pure domain module (`parentImages.ts`) normalizes images. One additive `images jsonb` column stores them; the legacy `image` column mirrors the first image so existing code is untouched. The admin form gets an Images list component. The studio's `buildViews` maps images to views, and layer state/serialization becomes per view.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind 4, Supabase (Postgres jsonb), Vitest (node env, `src/**/*.test.ts`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-28-custom-tee-design-design.md`, section "Phase B: Multiple titled parent images".
- The migration file is WRITTEN but must NOT be applied to any database in this plan (the user must approve after a backup).
- `parent_products.image` keeps mirroring the first image URL; every writer sets both. Reads must work before the migration (fallback to the single `image` as `Front`).
- Image rules: max 8 (`MAX_PARENT_IMAGES`), title max 40 chars, trimmed, blank/duplicate URLs dropped, blank titles become `Image N` by position.
- View ids are `view-<index>`; saved designs use `layersByView`; legacy `layers` loads into `view-0`.
- Admin UI style: existing admin conventions (sharp inputs `rounded-none border border-[#EEEEEE]`, black buttons `text-[11px] font-bold uppercase tracking-widest`). Storefront/studio style: 8px radius.
- Work stays on branch `feat/custom-tee-design`; do not push or merge to main.
- Vitest only runs `src/**/*.test.ts`; component code is verified with `npx tsc --noEmit` and the browser.

## File Structure

- Modify `src/shared/domain/types.ts` — add `ParentImage`, `ParentProduct.images?`.
- Create `src/features/catalog/domain/parentImages.ts` (+ `parentImages.test.ts`)
- Create `supabase/migrations/20261028000300_parent_product_images.sql`
- Modify `src/features/catalog/infrastructure/firestoreParentProductsRepository.ts` (read)
- Modify `src/features/admin/parentProducts/infrastructure/firestoreParentProductsAdminRepository.ts` (write)
- Create `src/features/admin/parentProducts/presentation/ParentImagesField.tsx`
- Modify `src/features/admin/parentProducts/presentation/ParentProductManager.tsx`
- Modify `src/features/customTee/domain/views.ts` (+ test), `design.ts` (+ test)
- Modify `src/features/customTee/application/useStudioState.ts`
- Modify `src/features/customTee/presentation/studio/StudioEditor.tsx`, `StudioPage.tsx`

---

### Task 1: Types and parent images domain

**Files:**
- Modify: `src/shared/domain/types.ts`
- Create: `src/features/catalog/domain/parentImages.ts`
- Test: `src/features/catalog/domain/parentImages.test.ts`

**Interfaces:**
- Produces:
  - `ParentImage = { title: string; url: string }` (exported from `@/shared/domain/types`); `ParentProduct.images?: ParentImage[]`.
  - From `parentImages.ts`: `MAX_PARENT_IMAGES = 8`, `MAX_IMAGE_TITLE_LENGTH = 40`, `IMAGE_TITLE_SUGGESTIONS = ['Front','Back','Left','Right']`, `parseParentImages(raw: unknown): ParentImage[]`, `sanitizeParentImages(images: ParentImage[]): ParentImage[]`, `getParentImages(parent: { image?: string; images?: ParentImage[] }): ParentImage[]`, `primaryImageUrl(images: ParentImage[]): string`, `nextImageTitle(images: ParentImage[]): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  MAX_PARENT_IMAGES,
  MAX_IMAGE_TITLE_LENGTH,
  parseParentImages,
  sanitizeParentImages,
  getParentImages,
  primaryImageUrl,
  nextImageTitle,
} from './parentImages';

describe('sanitizeParentImages', () => {
  it('trims, drops blank and duplicate URLs, and numbers untitled images by position', () => {
    const out = sanitizeParentImages([
      { title: '  ', url: ' a.jpg ' },
      { title: 'Back', url: 'b.jpg' },
      { title: 'Dup', url: 'a.jpg' },
      { title: 'Blank', url: '   ' },
      { title: '', url: 'c.jpg' },
    ]);
    expect(out).toEqual([
      { title: 'Image 1', url: 'a.jpg' },
      { title: 'Back', url: 'b.jpg' },
      { title: 'Image 3', url: 'c.jpg' },
    ]);
  });
  it('caps the count and the title length', () => {
    const many = Array.from({ length: MAX_PARENT_IMAGES + 3 }, (_, i) => ({ title: 'T'.repeat(100), url: `u${i}.jpg` }));
    const out = sanitizeParentImages(many);
    expect(out).toHaveLength(MAX_PARENT_IMAGES);
    expect(out[0].title).toHaveLength(MAX_IMAGE_TITLE_LENGTH);
  });
});

describe('parseParentImages', () => {
  it('reads a valid jsonb array and skips malformed entries', () => {
    const out = parseParentImages([{ title: 'Front', url: 'f.jpg' }, null, 'x', { title: 5, url: 'g.jpg' }, { url: '' }, { title: 'Back' }]);
    expect(out).toEqual([
      { title: 'Front', url: 'f.jpg' },
      { title: 'Image 2', url: 'g.jpg' },
    ]);
  });
  it('returns [] for non-arrays', () => {
    expect(parseParentImages(null)).toEqual([]);
    expect(parseParentImages('nope')).toEqual([]);
    expect(parseParentImages({})).toEqual([]);
  });
});

describe('getParentImages', () => {
  it('prefers the images list', () => {
    expect(getParentImages({ image: 'old.jpg', images: [{ title: 'Back', url: 'b.jpg' }] })).toEqual([{ title: 'Back', url: 'b.jpg' }]);
  });
  it('falls back to the single image as Front', () => {
    expect(getParentImages({ image: ' old.jpg ' })).toEqual([{ title: 'Front', url: 'old.jpg' }]);
    expect(getParentImages({ image: 'old.jpg', images: [] })).toEqual([{ title: 'Front', url: 'old.jpg' }]);
  });
  it('returns [] when there is nothing', () => {
    expect(getParentImages({})).toEqual([]);
    expect(getParentImages({ image: '  ' })).toEqual([]);
  });
});

describe('primaryImageUrl / nextImageTitle', () => {
  it('uses the first image', () => {
    expect(primaryImageUrl([{ title: 'A', url: 'a.jpg' }, { title: 'B', url: 'b.jpg' }])).toBe('a.jpg');
    expect(primaryImageUrl([])).toBe('');
  });
  it('suggests the first unused standard title, case-insensitively, else blank', () => {
    expect(nextImageTitle([])).toBe('Front');
    expect(nextImageTitle([{ title: 'front', url: 'a' }])).toBe('Back');
    expect(nextImageTitle([{ title: 'Front', url: 'a' }, { title: 'Back', url: 'b' }, { title: 'Left', url: 'c' }, { title: 'Right', url: 'd' }])).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/catalog/domain/parentImages.test.ts`
Expected: FAIL — cannot resolve `./parentImages`.

- [ ] **Step 3: Implement**

In `src/shared/domain/types.ts`, above `ParentProduct` add:
```ts
export interface ParentImage {
  title: string; // e.g. 'Front', 'Back'
  url: string;
}
```
and inside `ParentProduct` (after `image`) add:
```ts
  images?: ParentImage[]; // titled images in display order; `image` mirrors images[0].url
```

Create `src/features/catalog/domain/parentImages.ts`:
```ts
import type { ParentImage } from '@/shared/domain/types';

export const MAX_PARENT_IMAGES = 8;
export const MAX_IMAGE_TITLE_LENGTH = 40;
export const IMAGE_TITLE_SUGGESTIONS = ['Front', 'Back', 'Left', 'Right'] as const;

// Normalizes what the admin form submits: trims, drops blank/duplicate URLs, caps the count and title length,
// and gives untitled images a positional "Image N" title.
export function sanitizeParentImages(images: ParentImage[]): ParentImage[] {
  const seen = new Set<string>();
  const kept: ParentImage[] = [];
  for (const img of images) {
    const url = (img.url ?? '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    kept.push({ title: (img.title ?? '').trim().slice(0, MAX_IMAGE_TITLE_LENGTH), url });
    if (kept.length === MAX_PARENT_IMAGES) break;
  }
  return kept.map((img, i) => ({ ...img, title: img.title || `Image ${i + 1}` }));
}

// Tolerant reader for the jsonb column: skips malformed entries.
export function parseParentImages(raw: unknown): ParentImage[] {
  if (!Array.isArray(raw)) return [];
  const parsed: ParentImage[] = [];
  for (const v of raw) {
    if (!v || typeof v !== 'object') continue;
    const o = v as Record<string, unknown>;
    if (typeof o.url !== 'string' || !o.url.trim()) continue;
    parsed.push({ title: typeof o.title === 'string' ? o.title : '', url: o.url });
  }
  return sanitizeParentImages(parsed);
}

// The parent's images, falling back to its single legacy `image` as "Front".
export function getParentImages(parent: { image?: string; images?: ParentImage[] }): ParentImage[] {
  if (parent.images && parent.images.length > 0) return parent.images;
  const image = (parent.image ?? '').trim();
  return image ? [{ title: 'Front', url: image }] : [];
}

export const primaryImageUrl = (images: ParentImage[]): string => images[0]?.url ?? '';

// The first standard title (Front/Back/Left/Right) not used yet, else blank (sanitize numbers it).
export function nextImageTitle(images: ParentImage[]): string {
  const used = new Set(images.map((i) => i.title.trim().toLowerCase()));
  return IMAGE_TITLE_SUGGESTIONS.find((s) => !used.has(s.toLowerCase())) ?? '';
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/features/catalog/domain/parentImages.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/shared/domain/types.ts src/features/catalog/domain/parentImages.ts src/features/catalog/domain/parentImages.test.ts
git commit -m "feat(parent-images): ParentImage type and titled-images domain"
```

---

### Task 2: Migration file and repositories

**Files:**
- Create: `supabase/migrations/20261028000300_parent_product_images.sql`
- Modify: `src/features/catalog/infrastructure/firestoreParentProductsRepository.ts` (read side, `assembleParentProduct`)
- Modify: `src/features/admin/parentProducts/infrastructure/firestoreParentProductsAdminRepository.ts` (`saveParentProduct`)

**Interfaces:**
- Consumes: `parseParentImages`, `getParentImages`, `sanitizeParentImages`, `primaryImageUrl` from `@/features/catalog/domain/parentImages`.
- Produces: `ParentProduct` objects returned by `fetchAllParentProducts`/`fetchParentProductById` now always have `images` (from the column, or the single-image fallback) and `image === images[0]?.url ?? ''`. `saveParentProduct` writes `images` (sanitized) and `image` (first URL).

- [ ] **Step 1: Write the migration** (do NOT apply it anywhere)

```sql
-- Titled images for a parent product: [{ "title": "Front", "url": "https://..." }, ...] in display order.
-- Additive. `image` stays and mirrors the first entry (the admin app writes both), so existing reads are unchanged.
-- NOTE: back up the database before applying.

alter table parent_products
  add column if not exists images jsonb not null default '[]'::jsonb;

-- Backfill: the existing single image becomes the "Front" image.
update parent_products
set images = jsonb_build_array(jsonb_build_object('title', 'Front', 'url', image))
where image <> '' and images = '[]'::jsonb;
```

- [ ] **Step 2: Update the read side.** In `assembleParentProduct` (currently builds `{ id, name, image: row.image || '', category, subcategory, sizeOrder, stockBySize }`), compute the images and mirror the primary:
```ts
import { getParentImages, parseParentImages } from '@/features/catalog/domain/parentImages';
// ...inside assembleParentProduct, before the return:
  const stored = parseParentImages(row.images); // row.images is undefined before the migration is applied
  const images = stored.length > 0 ? stored : getParentImages({ image: row.image || '' });
// ...in the returned object:
    image: images[0]?.url ?? '',
    images,
```
(Keep all other fields as they are.)

- [ ] **Step 3: Update the write side.** In `saveParentProduct` replace the `parent_products` upsert so it writes both columns:
```ts
import { getParentImages, primaryImageUrl, sanitizeParentImages } from '@/features/catalog/domain/parentImages';
// ...
  const images = sanitizeParentImages(pp.images ?? getParentImages(pp));
  const { error: parentError } = await supabase
    .from('parent_products')
    .upsert({ id: pp.id, name: pp.name, image: primaryImageUrl(images), images, size_order: pp.sizeOrder, ...cols });
```

- [ ] **Step 4: Typecheck and run all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass (existing repository tests must keep passing; if a test asserts the exact upsert payload, update it to include `images`).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261028000300_parent_product_images.sql src/features/catalog/infrastructure/firestoreParentProductsRepository.ts src/features/admin/parentProducts/infrastructure/firestoreParentProductsAdminRepository.ts
git commit -m "feat(parent-images): images column migration (not applied) and repository read/write"
```

---

### Task 3: Admin Images field

**Files:**
- Create: `src/features/admin/parentProducts/presentation/ParentImagesField.tsx`
- Modify: `src/features/admin/parentProducts/presentation/ParentProductManager.tsx`

**Interfaces:**
- Consumes: `ParentImage` type; `IMAGE_TITLE_SUGGESTIONS`, `MAX_IMAGE_TITLE_LENGTH`, `MAX_PARENT_IMAGES`, `getParentImages`, `nextImageTitle`, `primaryImageUrl`, `sanitizeParentImages` from `@/features/catalog/domain/parentImages`.
- Produces: `ParentImagesField({ images: ParentImage[]; onChange(images: ParentImage[]): void; onUpload(): void; uploading: boolean })`.

- [ ] **Step 1: Write `ParentImagesField.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import type { ParentImage } from '@/shared/domain/types';
import {
  IMAGE_TITLE_SUGGESTIONS,
  MAX_IMAGE_TITLE_LENGTH,
  MAX_PARENT_IMAGES,
  nextImageTitle,
} from '@/features/catalog/domain/parentImages';

type Props = {
  images: ParentImage[];
  onChange: (images: ParentImage[]) => void;
  onUpload: () => void;
  uploading: boolean;
};

const LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5';
const INPUT = 'rounded-none border border-[#EEEEEE] bg-white py-2 px-3 text-xs text-black focus:border-black focus:outline-none';
const ICON_BTN = 'flex h-8 w-8 shrink-0 items-center justify-center border border-[#EEEEEE] text-[#717171] hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-30';
const PRIMARY_BTN = 'bg-black hover:bg-[#333333] text-white text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 transition-colors flex items-center justify-center space-x-1.5 shrink-0 disabled:bg-[#717171] disabled:cursor-not-allowed';

export default function ParentImagesField({ images, onChange, onUpload, uploading }: Props) {
  const [url, setUrl] = useState('');
  const full = images.length >= MAX_PARENT_IMAGES;

  const setTitle = (i: number, title: string) => onChange(images.map((img, idx) => (idx === i ? { ...img, title } : img)));
  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = images.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const addUrl = () => {
    const trimmed = url.trim();
    if (!trimmed || full) return;
    onChange([...images, { title: nextImageTitle(images), url: trimmed }]);
    setUrl('');
  };

  return (
    <div>
      <span className={LABEL}>
        Images ({images.length}/{MAX_PARENT_IMAGES}) — the first is the primary image
      </span>

      <datalist id="parent-image-titles">
        {IMAGE_TITLE_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {images.length > 0 && (
        <ul className="mb-3 space-y-2">
          {images.map((img, i) => (
            <li key={`${img.url}-${i}`} className="flex items-center gap-3 border border-[#EEEEEE] bg-[#FAF9F6] p-2.5">
              <img
                src={img.url}
                alt={img.title || `Image ${i + 1}`}
                className="h-14 w-14 shrink-0 border border-[#EEEEEE] object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Invalid+Image';
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <input
                    aria-label={`Title for image ${i + 1}`}
                    list="parent-image-titles"
                    value={img.title}
                    maxLength={MAX_IMAGE_TITLE_LENGTH}
                    placeholder={`Image ${i + 1}`}
                    onChange={(e) => setTitle(i, e.target.value)}
                    className={`${INPUT} w-full max-w-[220px]`}
                  />
                  {i === 0 && (
                    <span className="bg-black px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-white">Primary</span>
                  )}
                </div>
                <p className="mt-1 truncate font-mono text-[10px] text-[#717171]">{img.url}</p>
              </div>
              <button type="button" aria-label="Move image up" disabled={i === 0} onClick={() => move(i, -1)} className={ICON_BTN}>
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Move image down" disabled={i === images.length - 1} onClick={() => move(i, 1)} className={ICON_BTN}>
                <ArrowDown className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Remove image" onClick={() => remove(i)} className={`${ICON_BTN} hover:!border-red-600 hover:!text-red-600`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={url}
          disabled={full}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder={full ? 'Maximum images reached' : 'Paste an image URL'}
          className={`${INPUT} flex-1 py-2.5`}
        />
        <button type="button" onClick={addUrl} disabled={full || !url.trim()} className={PRIMARY_BTN}>
          <Plus className="h-3.5 w-3.5" />
          <span>Add URL</span>
        </button>
        <button type="button" onClick={onUpload} disabled={full || uploading} className={PRIMARY_BTN}>
          {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          <span>{uploading ? 'Uploading…' : 'Upload & Crop'}</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate into `ParentProductManager.tsx`** (read the file first; make exactly these edits):
1. Imports: add `import type { ParentImage } from '@/shared/domain/types';` (extend the existing `ParentProduct` type import), `import ParentImagesField from './ParentImagesField';`, and `import { getParentImages, nextImageTitle, primaryImageUrl, sanitizeParentImages } from '@/features/catalog/domain/parentImages';`. Remove now-unused lucide imports (`Upload`, `RefreshCw`) only if nothing else in the file uses them (check with tsc).
2. `FormState`: replace `image: string;` with `images: ParentImage[];`. `emptyForm` and `openCreate` use `images: []` instead of `image: ''`. `openEdit` uses `images: getParentImages(pp)`.
3. `handleCropComplete`: after `const url = await uploadProductImage(...)`, replace `setForm((prev) => ({ ...prev, image: url }));` with `setForm((prev) => ({ ...prev, images: [...prev.images, { title: nextImageTitle(prev.images), url }] }));`.
4. `handleSave`: compute `const images = sanitizeParentImages(form.images);` and pass `image: primaryImageUrl(images), images,` to `saveParentProduct` in place of `image: form.image.trim(),`.
5. Replace the whole `{/* Image */} <div> ... </div>` JSX block (the label "Image (Paste URL or Upload Directly)", the URL input, the Upload & Crop button, and the preview row) with:
```tsx
                <ParentImagesField
                  images={form.images}
                  onChange={(images) => setForm((prev) => ({ ...prev, images }))}
                  onUpload={() => setIsCropperOpen(true)}
                  uploading={isUploadingImage}
                />
```
Leave the `ImageCropperModal` usage unchanged (title may stay).

- [ ] **Step 3: Typecheck and run all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/admin/parentProducts/presentation/ParentImagesField.tsx src/features/admin/parentProducts/presentation/ParentProductManager.tsx
git commit -m "feat(parent-images): admin multi-image list with titles on the parent form"
```

---

### Task 4: Studio views and per-view design format (domain)

**Files:**
- Modify: `src/features/customTee/domain/views.ts` (+ `views.test.ts`)
- Modify: `src/features/customTee/domain/design.ts` (+ `design.test.ts`)

**Interfaces:**
- Consumes: `getParentImages` from `@/features/catalog/domain/parentImages`; `Layer` and existing `parseLayer` logic in `design.ts`.
- Produces:
  - `views.ts`: `StudioView = { id: string; label: string; image: string }` (id is no longer the `'front'|'back'|...` union; remove `ViewId`), `viewIdAt(index: number): string` (returns `view-${index}`), `buildViews(parent: ParentProduct, color?: ProductVariant): StudioView[]` (one view per `getParentImages(parent)` entry; the first view's image is `color?.image || url`).
  - `design.ts`: `StudioDesign = { parentProductId: string; size: string; colorName?: string; layersByView: Record<string, Layer[]> }`. `parseDesign` loads `layersByView` (keys must match `/^view-\d{1,2}$/`; each value an array parsed by the existing layer validator, with existing id validation and per-list de-duplication) and, when `layersByView` is absent, the legacy `layers` array into `view-0`. Empty views are omitted from the parsed result. `serializeDesign` is unchanged (JSON of the object).

- [ ] **Step 1: Update/extend the tests first**

`views.test.ts` — replace the file with:
```ts
import { describe, it, expect } from 'vitest';
import type { ParentProduct } from '@/shared/domain/types';
import { buildViews, viewIdAt } from './views';

const base: ParentProduct = { id: 'p', name: 'Tee', image: 'p.jpg', category: 'T', sizeOrder: ['M'], stockBySize: { M: 1 } };

describe('buildViews', () => {
  it('falls back to the single image as the Front view', () => {
    expect(buildViews(base)).toEqual([{ id: 'view-0', label: 'Front', image: 'p.jpg' }]);
  });
  it('builds one view per titled image with positional ids', () => {
    const parent = { ...base, images: [{ title: 'Front', url: 'f.jpg' }, { title: 'Back', url: 'b.jpg' }, { title: 'Left sleeve', url: 'l.jpg' }] };
    expect(buildViews(parent)).toEqual([
      { id: 'view-0', label: 'Front', image: 'f.jpg' },
      { id: 'view-1', label: 'Back', image: 'b.jpg' },
      { id: 'view-2', label: 'Left sleeve', image: 'l.jpg' },
    ]);
  });
  it('applies the selected color variant image to the first view only', () => {
    const parent = { ...base, images: [{ title: 'Front', url: 'f.jpg' }, { title: 'Back', url: 'b.jpg' }] };
    const views = buildViews(parent, { id: 'v', name: 'Black', image: 'black.jpg' });
    expect(views.map((v) => v.image)).toEqual(['black.jpg', 'b.jpg']);
    expect(buildViews(parent, { id: 'v', name: 'Black' })[0].image).toBe('f.jpg');
  });
  it('returns no views when there is no image', () => {
    expect(buildViews({ ...base, image: '' })).toEqual([]);
  });
  it('viewIdAt is positional', () => {
    expect(viewIdAt(0)).toBe('view-0');
    expect(viewIdAt(3)).toBe('view-3');
  });
});
```

`design.test.ts` — read the current file; update every `StudioDesign` literal to use `layersByView: { 'view-0': [...] }` instead of `layers: [...]`, update assertions that read `parsed.layers` to read `parsed.layersByView['view-0']`, and ADD these tests:
```ts
describe('per-view layers', () => {
  const img = (id: string) => createImageLayer({ id, name: `${id}.png`, src: 'data:image/png;base64,AAAA', aspect: 1 });
  it('round-trips layers for several views and drops empty views', () => {
    const design = { parentProductId: 'p', size: 'M', layersByView: { 'view-0': [img('a')], 'view-1': [img('b'), createTextLayer({ id: 't', text: 'Hi' })] } };
    expect(parseDesign(serializeDesign(design))).toEqual(design);
    const withEmpty = { ...design, layersByView: { ...design.layersByView, 'view-2': [] } };
    expect(Object.keys(parseDesign(serializeDesign(withEmpty))!.layersByView)).toEqual(['view-0', 'view-1']);
  });
  it('loads the legacy layers array into view-0', () => {
    const raw = JSON.stringify({ parentProductId: 'p', size: 'M', layers: [img('a')] });
    expect(Object.keys(parseDesign(raw)!.layersByView)).toEqual(['view-0']);
    expect(parseDesign(raw)!.layersByView['view-0'][0].id).toBe('a');
  });
  it('ignores view keys that are not view-<digits>', () => {
    const raw = JSON.stringify({ parentProductId: 'p', size: 'M', layersByView: { 'view-0': [img('a')], __proto__x: [img('b')], 'view-': [img('c')], constructor: [img('d')] } });
    expect(Object.keys(parseDesign(raw)!.layersByView)).toEqual(['view-0']);
  });
  it('de-duplicates layer ids within a view', () => {
    const raw = JSON.stringify({ parentProductId: 'p', size: 'M', layersByView: { 'view-0': [img('a'), img('a')] } });
    expect(parseDesign(raw)!.layersByView['view-0']).toHaveLength(1);
  });
});
```
Ensure the test file imports `createImageLayer`, `createTextLayer` (already imported in the existing file; add if missing).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/customTee/domain/views.test.ts src/features/customTee/domain/design.test.ts`
Expected: FAIL (new behavior missing).

- [ ] **Step 3: Implement**

`views.ts` (replace the file):
```ts
import type { ParentProduct, ProductVariant } from '@/shared/domain/types';
import { getParentImages } from '@/features/catalog/domain/parentImages';

export type StudioView = { id: string; label: string; image: string };

export const viewIdAt = (index: number): string => `view-${index}`;

// One view per titled parent image; the selected color variant's image replaces the first view's image.
export function buildViews(parent: ParentProduct, color?: ProductVariant): StudioView[] {
  return getParentImages(parent).map((img, i) => ({
    id: viewIdAt(i),
    label: img.title,
    image: i === 0 ? color?.image || img.url : img.url,
  }));
}
```

`design.ts`: change the `StudioDesign` type to `layersByView: Record<string, Layer[]>`; keep `parseLayer` as is. Replace the layer-list parsing in `parseDesign` with a helper `parseLayerList(list: unknown): Layer[]` (array → `parseLayer` each, drop nulls, drop duplicate ids keeping the first) and:
```ts
const VIEW_KEY = /^view-\d{1,2}$/;
// inside parseDesign after validating parentProductId/size:
    const layersByView: Record<string, Layer[]> = {};
    if (v.layersByView && typeof v.layersByView === 'object' && !Array.isArray(v.layersByView)) {
      for (const [key, list] of Object.entries(v.layersByView)) {
        if (!VIEW_KEY.test(key)) continue;
        const layers = parseLayerList(list);
        if (layers.length > 0) layersByView[key] = layers;
      }
    } else {
      const legacy = parseLayerList(v.layers); // older designs stored a single `layers` array
      if (legacy.length > 0) layersByView['view-0'] = legacy;
    }
    return { parentProductId: v.parentProductId, size: v.size, colorName: typeof v.colorName === 'string' ? v.colorName : undefined, layersByView };
```
(Use `Object.create(null)`-free plain object; the key regex already blocks `__proto__`/`constructor`.)

- [ ] **Step 4: Run tests** — domain only; the UI files will not typecheck until Task 5.

Run: `npx vitest run src/features/customTee/domain`
Expected: PASS. (Do NOT run `tsc` as a gate for this task: `StudioEditor.tsx`/`StudioPage.tsx`/`useStudioState.ts` still use the old shapes and are fixed in Task 5. Note the expected tsc errors in your report.)

- [ ] **Step 5: Commit**

```bash
git add src/features/customTee/domain/views.ts src/features/customTee/domain/views.test.ts src/features/customTee/domain/design.ts src/features/customTee/domain/design.test.ts
git commit -m "feat(custom-tee): studio views from parent images and per-view design format"
```

---

### Task 5: Per-view layer state and studio wiring

**Files:**
- Modify: `src/features/customTee/application/useStudioState.ts`
- Modify: `src/features/customTee/presentation/studio/StudioEditor.tsx`
- Modify: `src/features/customTee/presentation/studio/StudioPage.tsx`

**Interfaces:**
- Consumes: Task 4 `buildViews`, `StudioDesign.layersByView`; existing history/layers functions.
- Produces:
  - `useStudioState(initialLayersByView: Record<string, Layer[]>, viewId: string)` returning everything it returned before (all values/operations apply to the layers of `viewId`) plus `layersByView: Record<string, Layer[]>` (the whole record, for saving).

- [ ] **Step 1: `useStudioState.ts`** (read the current file; keep its structure and all returned members, change as follows):
  - History type becomes `History<Record<string, Layer[]>>`, initial `createHistory(initialLayersByView)`.
  - Add `const EMPTY: Layer[] = [];` at module scope and this helper at module scope:
```ts
type ByView = Record<string, Layer[]>;
// Applies `fn` to one view's layers; returns the SAME record when nothing changed so history no-ops still work.
const mapView = (rec: ByView, viewId: string, fn: (ls: Layer[]) => Layer[]): ByView => {
  const current = rec[viewId] ?? EMPTY;
  const next = fn(current);
  return next === current ? rec : { ...rec, [viewId]: next };
};
```
  - `const layersByView = history.present; const layers = layersByView[viewId] ?? EMPTY;` and `selected` is looked up in `layers`.
  - Every operation that previously did `commit(h, fn(h.present))`, `live(h, updateLayer(h.present, ...))`, `h.present.find(...)` must operate through `mapView(h.present, viewId, ...)` / on `h.present[viewId] ?? EMPTY` (add, addText, addImage, patch, patchLive, remove, toggle, flip, align, move, reorder). The `change` helper becomes `(fn) => setHistory((h) => commit(h, mapView(h.present, viewId, fn)))`; any `useCallback` over these must include `viewId` in its deps.
  - Return `layersByView` in addition to the existing members. `selectedId` stays validated against the active view's layers (`selected ? selected.id : null`).

- [ ] **Step 2: `StudioEditor.tsx`** (read the current file and apply):
  - Props: replace `initialLayers: Layer[]` with `initialLayersByView: Record<string, Layer[]>`.
  - Order the hooks so views exist before the studio state: compute `colorName` state and `const color = card.colors.find(...)`, `const views = useMemo(() => buildViews(parent, color), [parent, color])`, `const [activeViewId, setActiveViewId] = useState('view-0')`, `const view = views.find((v) => v.id === activeViewId) ?? views[0]`, THEN `const studio = useStudioState(initialLayersByView, view?.id ?? 'view-0')`. Remove the old `setActiveView`/`activeView` state in favor of `activeViewId`/`setActiveViewId`; pass `activeView={view?.id ?? 'view-0'}` and `onView={setActiveViewId}` to `StudioToolbar` and update the thumbnail buttons to `setActiveViewId`.
  - When the active view changes, clear the size measurement: `useEffect(() => setSelectedSize(null), [view?.id])`.
  - `save()`: build the design as `{ parentProductId: parent.id, size, colorName, layersByView: Object.fromEntries(Object.entries(studio.layersByView).filter(([, ls]) => ls.length > 0)) }` (typed `StudioDesign`).
  - Show the active view's label in the canvas `baseAlt` (already `${parent.name} ${view.label}`).
  - Any other reference to `StudioDesign.layers` or `initialLayers` must be updated.

- [ ] **Step 3: `StudioPage.tsx`:** pass `initialLayersByView={restore?.layersByView ?? {}}` instead of `initialLayers={restore?.layers ?? []}`.

- [ ] **Step 4: Typecheck and run all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/customTee/application/useStudioState.ts src/features/customTee/presentation/studio/StudioEditor.tsx src/features/customTee/presentation/studio/StudioPage.tsx
git commit -m "feat(custom-tee): per-view layers and view tabs from parent images"
```

---

### Task 6: Browser verification

**Files:** none (verification only; fix defects in the files above).

The migration is NOT applied, so verify without writing to the database: stub the network where needed.

- [ ] **Step 1: Admin form.** Open `/admin/parent-products`, edit a parent: the Images list shows the existing image as "Front" (Primary). Add two image URLs (titles auto-suggest Back, Left), rename one, move one up/down, remove one, confirm the max-8 limit message/disabled state, confirm the Upload & Crop modal still opens. Do NOT click Save against the real database (the column does not exist yet).
- [ ] **Step 2: Studio views.** Stub `window.fetch` for the `parent_products` response so the chosen parent has `images: [{title:'Front',url:A},{title:'Back',url:B}]`, open the studio via the popup flow. Expected: two view tabs/thumbnails labelled Front and Back; switching views swaps the base image.
- [ ] **Step 3: Per-view layers.** Add a layer on Front, switch to Back: the Back canvas has no layer and the layers list is empty; add a different layer; switch back: each view keeps its own layers; undo/redo still steps correctly; Save, reload: both views' layers restore.
- [ ] **Step 4: Legacy design.** In `sessionStorage['custom-tee-design']` store an old-format design (`layers: [...]` with a text layer) and reload: it appears on the first view.
- [ ] **Step 5: Final checks:** `npx tsc --noEmit && npx vitest run`; commit any fixes.
