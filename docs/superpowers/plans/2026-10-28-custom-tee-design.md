# Custom Tee Design (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customer-facing `/custom-tee` flow: four dependent selections (category → subcategory → size → parent product) followed by a Design Studio, ending at a saved-design summary.

**Architecture:** Pure domain functions (`selection`, `cards`, `design`) hold all eligibility/reset/placement logic and are unit-tested in vitest's node environment. A thin client component (`CustomTeeFlow`) loads parents and products via existing catalog repositories and wires the domain to presentation components. No schema change, no stock writes.

**Tech Stack:** Next.js 15 (app router), React 19, TypeScript, Tailwind 4, Supabase client (existing repos), Vitest (`src/**/*.test.ts`, node env).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-28-custom-tee-design-design.md`.
- No migration, no schema change, no stock deduction or reservation.
- Eligible stock means `parent.stockBySize[size] > 0`.
- Changing category clears subcategory, size, parent. Changing subcategory clears size, parent. Changing size clears parent.
- "Continue to Design Studio" is hidden until all four selections validate.
- Revalidate against freshly fetched stock when opening the studio and when saving.
- Out of scope: pricing, artwork upload storage, cart/order persistence, `OrderItem` changes.
- Work stays on branch `feat/custom-tee-design`; do not merge or push to main.
- Vitest only picks up `src/**/*.test.ts` (no jsx tests), so keep logic in `.ts` domain files.

## File Structure

- Create `src/features/customTee/domain/selection.ts` — eligibility, reducers, validation.
- Create `src/features/customTee/domain/selection.test.ts`
- Create `src/features/customTee/domain/cards.ts` — card view-model from parents + products.
- Create `src/features/customTee/domain/cards.test.ts`
- Create `src/features/customTee/domain/design.ts` — Design type, artwork clamping, file validation, session (de)serialization.
- Create `src/features/customTee/domain/design.test.ts`
- Create `src/features/customTee/application/useCustomTeeData.ts` — loads parents/products/categories, `refreshParents()`.
- Create `src/features/customTee/presentation/ParentCard.tsx`
- Create `src/features/customTee/presentation/SelectionWizard.tsx`
- Create `src/features/customTee/presentation/DesignStudio.tsx`
- Create `src/features/customTee/presentation/CustomTeeFlow.tsx` — step orchestration (select → studio → summary).
- Create `src/app/custom-tee/page.tsx` — route.

---

### Task 1: Selection domain

**Files:**
- Create: `src/features/customTee/domain/selection.ts`
- Test: `src/features/customTee/domain/selection.test.ts`

**Interfaces:**
- Produces:
  - `type Selection = { category: string; subcategory: string; size: string; parentId: string }`
  - `type SelectionStep = 'category' | 'subcategory' | 'size' | 'parent'`
  - `EMPTY_SELECTION: Selection`
  - `eligibleCategories(parents: ParentProduct[]): string[]`
  - `eligibleSubcategories(parents, category): string[]`
  - `eligibleSizes(parents, category, subcategory): string[]`
  - `eligibleParents(parents, category, subcategory, size): ParentProduct[]`
  - `selectCategory/selectSubcategory/selectSize/selectParent(sel, value): Selection`
  - `isComplete(sel): boolean`
  - `validateSelection(parents, sel): { ok: true } | { ok: false; resetTo: SelectionStep; reason: string }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import type { ParentProduct } from '@/shared/domain/types';
import {
  EMPTY_SELECTION,
  eligibleCategories,
  eligibleSubcategories,
  eligibleSizes,
  eligibleParents,
  selectCategory,
  selectSubcategory,
  selectSize,
  selectParent,
  isComplete,
  validateSelection,
} from './selection';

const parent = (id: string, category: string, subcategory: string, stockBySize: Record<string, number>): ParentProduct => ({
  id,
  name: id,
  category,
  subcategory,
  sizeOrder: Object.keys(stockBySize),
  stockBySize,
});

const parents = [
  parent('a', 'T-Shirts', 'Graphic', { S: 0, M: 45, L: 2 }),
  parent('b', 'T-Shirts', 'Graphic', { S: 3, M: 0, L: 0 }),
  parent('c', 'T-Shirts', 'Plain', { M: 5 }),
  parent('d', 'Hoodies', 'Zip', { M: 0 }),
  parent('e', 'Caps', '', { M: 9 }),
];

describe('eligibility', () => {
  it('lists categories that have stock somewhere, sorted, ignoring blank', () => {
    expect(eligibleCategories(parents)).toEqual(['Caps', 'T-Shirts']);
  });
  it('lists non-empty subcategories of a category with stock', () => {
    expect(eligibleSubcategories(parents, 'T-Shirts')).toEqual(['Graphic', 'Plain']);
    expect(eligibleSubcategories(parents, 'Hoodies')).toEqual([]);
  });
  it('lists only sizes with stock among matches, in canonical order', () => {
    expect(eligibleSizes(parents, 'T-Shirts', 'Graphic')).toEqual(['S', 'M', 'L']);
    expect(eligibleSizes(parents, 'T-Shirts', 'Plain')).toEqual(['M']);
    expect(eligibleSizes(parents, 'Hoodies', 'Zip')).toEqual([]);
  });
  it('lists parents with stock in the size', () => {
    expect(eligibleParents(parents, 'T-Shirts', 'Graphic', 'M').map((p) => p.id)).toEqual(['a']);
    expect(eligibleParents(parents, 'T-Shirts', 'Graphic', 'S').map((p) => p.id)).toEqual(['b']);
    expect(eligibleParents(parents, 'T-Shirts', 'Graphic', 'XL')).toEqual([]);
  });
});

describe('reducers', () => {
  const full = { category: 'T-Shirts', subcategory: 'Graphic', size: 'M', parentId: 'a' };
  it('changing category clears everything after it', () => {
    expect(selectCategory(full, 'Caps')).toEqual({ ...EMPTY_SELECTION, category: 'Caps' });
  });
  it('changing subcategory clears size and parent', () => {
    expect(selectSubcategory(full, 'Plain')).toEqual({ category: 'T-Shirts', subcategory: 'Plain', size: '', parentId: '' });
  });
  it('changing size clears parent', () => {
    expect(selectSize(full, 'L')).toEqual({ ...full, size: 'L', parentId: '' });
  });
  it('selecting a parent only sets the parent', () => {
    expect(selectParent({ ...full, parentId: '' }, 'a')).toEqual(full);
  });
  it('isComplete requires all four', () => {
    expect(isComplete(full)).toBe(true);
    expect(isComplete({ ...full, parentId: '' })).toBe(false);
  });
});

describe('validateSelection', () => {
  const full = { category: 'T-Shirts', subcategory: 'Graphic', size: 'M', parentId: 'a' };
  it('accepts a valid selection', () => {
    expect(validateSelection(parents, full)).toEqual({ ok: true });
  });
  it('resets to parent when its stock dropped to 0', () => {
    const drained = parents.map((p) => (p.id === 'a' ? parent('a', 'T-Shirts', 'Graphic', { S: 0, M: 0, L: 2 }) : p));
    const result = validateSelection(drained, full);
    expect(result).toMatchObject({ ok: false, resetTo: 'size' });
  });
  it('resets to parent when only the parent vanished but the size is still available', () => {
    const gone = parents.filter((p) => p.id !== 'a').concat(parent('z', 'T-Shirts', 'Graphic', { M: 1 }));
    expect(validateSelection(gone, full)).toMatchObject({ ok: false, resetTo: 'parent' });
  });
  it('resets to category when the category no longer exists', () => {
    expect(validateSelection([], full)).toMatchObject({ ok: false, resetTo: 'category' });
  });
  it('resets to the first missing step for an incomplete selection', () => {
    expect(validateSelection(parents, { ...full, parentId: '' })).toMatchObject({ ok: false, resetTo: 'parent' });
    expect(validateSelection(parents, EMPTY_SELECTION)).toMatchObject({ ok: false, resetTo: 'category' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/customTee/domain/selection.test.ts`
Expected: FAIL — cannot resolve `./selection`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { ParentProduct } from '@/shared/domain/types';

export type Selection = { category: string; subcategory: string; size: string; parentId: string };
export type SelectionStep = 'category' | 'subcategory' | 'size' | 'parent';

export const EMPTY_SELECTION: Selection = { category: '', subcategory: '', size: '', parentId: '' };

const hasStock = (p: ParentProduct, size: string) => (p.stockBySize[size] ?? 0) > 0;
const hasAnyStock = (p: ParentProduct) => p.sizeOrder.some((s) => hasStock(p, s));
const sortedUnique = (values: string[]) => Array.from(new Set(values)).sort();

export function eligibleCategories(parents: ParentProduct[]): string[] {
  return sortedUnique(parents.filter((p) => p.category.trim() && hasAnyStock(p)).map((p) => p.category));
}

export function eligibleSubcategories(parents: ParentProduct[], category: string): string[] {
  return sortedUnique(
    parents.filter((p) => p.category === category && (p.subcategory ?? '').trim() && hasAnyStock(p)).map((p) => p.subcategory as string),
  );
}

function matching(parents: ParentProduct[], category: string, subcategory: string): ParentProduct[] {
  return parents.filter((p) => p.category === category && (p.subcategory ?? '') === subcategory);
}

export function eligibleSizes(parents: ParentProduct[], category: string, subcategory: string): string[] {
  const sizes: string[] = [];
  for (const p of matching(parents, category, subcategory)) {
    for (const s of p.sizeOrder) {
      if (hasStock(p, s) && !sizes.includes(s)) sizes.push(s);
    }
  }
  return sizes;
}

export function eligibleParents(parents: ParentProduct[], category: string, subcategory: string, size: string): ParentProduct[] {
  return matching(parents, category, subcategory).filter((p) => hasStock(p, size));
}

export const selectCategory = (_sel: Selection, category: string): Selection => ({ ...EMPTY_SELECTION, category });
export const selectSubcategory = (sel: Selection, subcategory: string): Selection => ({
  category: sel.category,
  subcategory,
  size: '',
  parentId: '',
});
export const selectSize = (sel: Selection, size: string): Selection => ({ ...sel, size, parentId: '' });
export const selectParent = (sel: Selection, parentId: string): Selection => ({ ...sel, parentId });

export const isComplete = (sel: Selection): boolean => !!(sel.category && sel.subcategory && sel.size && sel.parentId);

export type SelectionValidation = { ok: true } | { ok: false; resetTo: SelectionStep; reason: string };

// Walks the selection in order and reports the first step that is no longer valid against `parents`.
export function validateSelection(parents: ParentProduct[], sel: Selection): SelectionValidation {
  if (!sel.category || !eligibleCategories(parents).includes(sel.category)) {
    return { ok: false, resetTo: 'category', reason: 'Please choose a category.' };
  }
  if (!sel.subcategory || !eligibleSubcategories(parents, sel.category).includes(sel.subcategory)) {
    return { ok: false, resetTo: 'subcategory', reason: 'Please choose a subcategory.' };
  }
  if (!sel.size || !eligibleSizes(parents, sel.category, sel.subcategory).includes(sel.size)) {
    return { ok: false, resetTo: 'size', reason: 'That size is no longer available. Please choose again.' };
  }
  if (!sel.parentId || !eligibleParents(parents, sel.category, sel.subcategory, sel.size).some((p) => p.id === sel.parentId)) {
    return { ok: false, resetTo: 'parent', reason: 'That tee is no longer available in this size. Please choose again.' };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/customTee/domain/selection.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/customTee/domain/selection.ts src/features/customTee/domain/selection.test.ts
git commit -m "feat(custom-tee): selection domain with cascading resets and stock eligibility"
```

---

### Task 2: Card view-model

**Files:**
- Create: `src/features/customTee/domain/cards.ts`
- Test: `src/features/customTee/domain/cards.test.ts`

**Interfaces:**
- Consumes: `ParentProduct`, `Product`, `ProductVariant` from `@/shared/domain/types`.
- Produces:
  - `interface ParentCardData { parent: ParentProduct; code: string; photos: string[]; colors: ProductVariant[]; stock: number }`
  - `buildParentCard(parent, products, size): ParentCardData` — `code` = `parent.id.slice(0,6).toUpperCase()`; `photos` = deduped non-empty `[parent.image, ...linked product image/gallery]`; `colors` = linked products' variants deduped by lowercase name; `stock` = `parent.stockBySize[size] ?? 0`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import type { ParentProduct, Product } from '@/shared/domain/types';
import { buildParentCard } from './cards';

const parent: ParentProduct = {
  id: 'abc123def',
  name: 'Premium Oversized Tee',
  image: 'p.jpg',
  category: 'T-Shirts',
  subcategory: 'Graphic',
  sizeOrder: ['M'],
  stockBySize: { M: 45 },
};

const product = (over: Partial<Product>): Product => ({
  id: 'x', name: 'x', description: '', price: 1, image: '', category: 'T-Shirts', rating: 5, ...over,
});

describe('buildParentCard', () => {
  it('derives code, stock, deduped photos and colors from linked products only', () => {
    const products = [
      product({ id: '1', parentProductId: 'abc123def', image: 'p.jpg', gallery: ['g1.jpg', ''], variants: [{ id: 'v1', name: 'Forest Green', colorCode: '#0a0' }] }),
      product({ id: '2', parentProductId: 'abc123def', image: 'b.jpg', variants: [{ id: 'v2', name: 'forest green' }, { id: 'v3', name: 'Black' }] }),
      product({ id: '3', parentProductId: 'other', image: 'nope.jpg', variants: [{ id: 'v4', name: 'Red' }] }),
    ];
    const card = buildParentCard(parent, products, 'M');
    expect(card.code).toBe('ABC123');
    expect(card.stock).toBe(45);
    expect(card.photos).toEqual(['p.jpg', 'g1.jpg', 'b.jpg']);
    expect(card.colors.map((c) => c.name)).toEqual(['Forest Green', 'Black']);
  });
  it('handles a parent with no linked products', () => {
    const card = buildParentCard({ ...parent, image: '' }, [], 'M');
    expect(card.photos).toEqual([]);
    expect(card.colors).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/customTee/domain/cards.test.ts`
Expected: FAIL — cannot resolve `./cards`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { ParentProduct, Product, ProductVariant } from '@/shared/domain/types';

export interface ParentCardData {
  parent: ParentProduct;
  code: string;
  photos: string[];
  colors: ProductVariant[];
  stock: number;
}

export function buildParentCard(parent: ParentProduct, products: Product[], size: string): ParentCardData {
  const linked = products.filter((p) => p.parentProductId === parent.id);

  const photos: string[] = [];
  const addPhoto = (url?: string) => {
    if (url && !photos.includes(url)) photos.push(url);
  };
  addPhoto(parent.image);
  for (const p of linked) {
    addPhoto(p.image);
    (p.gallery ?? []).forEach(addPhoto);
  }

  const colors: ProductVariant[] = [];
  const seen = new Set<string>();
  for (const p of linked) {
    for (const v of p.variants ?? []) {
      const key = v.name.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        colors.push(v);
      }
    }
  }

  return { parent, code: parent.id.slice(0, 6).toUpperCase(), photos, colors, stock: parent.stockBySize[size] ?? 0 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/customTee/domain/cards.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/customTee/domain/cards.ts src/features/customTee/domain/cards.test.ts
git commit -m "feat(custom-tee): parent card view-model derived from linked products"
```

---

### Task 3: Design domain

**Files:**
- Create: `src/features/customTee/domain/design.ts`
- Test: `src/features/customTee/domain/design.test.ts`

**Interfaces:**
- Produces:
  - `interface Artwork { x: number; y: number; scale: number }` (normalized: x,y in 0–1 of the preview box, scale 0.1–1 as fraction of preview width)
  - `interface Design { parentProductId: string; size: string; colorName?: string; artwork: Artwork | null }`
  - `DEFAULT_ARTWORK: Artwork`, `MAX_ARTWORK_BYTES = 5 * 1024 * 1024`, `DESIGN_STORAGE_KEY = 'custom-tee-design'`
  - `clampArtwork(a: Artwork): Artwork`
  - `validateArtworkFile(file: { type: string; size: number }): string | null`
  - `serializeDesign(d: Design): string`, `parseDesign(raw: string | null): Design | null`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { clampArtwork, validateArtworkFile, serializeDesign, parseDesign, MAX_ARTWORK_BYTES, DEFAULT_ARTWORK } from './design';

describe('clampArtwork', () => {
  it('keeps position within 0..1 and scale within 0.1..1', () => {
    expect(clampArtwork({ x: -1, y: 2, scale: 5 })).toEqual({ x: 0, y: 1, scale: 1 });
    expect(clampArtwork({ x: 0.5, y: 0.5, scale: 0 })).toEqual({ x: 0.5, y: 0.5, scale: 0.1 });
    expect(clampArtwork(DEFAULT_ARTWORK)).toEqual(DEFAULT_ARTWORK);
  });
});

describe('validateArtworkFile', () => {
  it('accepts png/jpeg/webp under the cap', () => {
    expect(validateArtworkFile({ type: 'image/png', size: 1000 })).toBeNull();
    expect(validateArtworkFile({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(validateArtworkFile({ type: 'image/webp', size: 1000 })).toBeNull();
  });
  it('rejects other types and oversized files', () => {
    expect(validateArtworkFile({ type: 'application/pdf', size: 10 })).toMatch(/PNG, JPG or WebP/);
    expect(validateArtworkFile({ type: 'image/png', size: MAX_ARTWORK_BYTES + 1 })).toMatch(/5 MB/);
  });
});

describe('design serialization', () => {
  it('round-trips a design', () => {
    const d = { parentProductId: 'p', size: 'M', colorName: 'Black', artwork: { x: 0.4, y: 0.4, scale: 0.3 } };
    expect(parseDesign(serializeDesign(d))).toEqual(d);
  });
  it('returns null for null, junk, or structurally invalid input', () => {
    expect(parseDesign(null)).toBeNull();
    expect(parseDesign('{nope')).toBeNull();
    expect(parseDesign(JSON.stringify({ size: 'M' }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/customTee/domain/design.test.ts`
Expected: FAIL — cannot resolve `./design`.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface Artwork {
  x: number;
  y: number;
  scale: number;
}

export interface Design {
  parentProductId: string;
  size: string;
  colorName?: string;
  artwork: Artwork | null;
}

export const DEFAULT_ARTWORK: Artwork = { x: 0.5, y: 0.4, scale: 0.4 };
export const MAX_ARTWORK_BYTES = 5 * 1024 * 1024;
export const DESIGN_STORAGE_KEY = 'custom-tee-design';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function clampArtwork(a: Artwork): Artwork {
  return { x: clamp(a.x, 0, 1), y: clamp(a.y, 0, 1), scale: clamp(a.scale, 0.1, 1) };
}

export function validateArtworkFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Please upload a PNG, JPG or WebP image.';
  if (file.size > MAX_ARTWORK_BYTES) return 'Artwork must be 5 MB or smaller.';
  return null;
}

export const serializeDesign = (d: Design): string => JSON.stringify(d);

export function parseDesign(raw: string | null): Design | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v.parentProductId !== 'string' || typeof v.size !== 'string') return null;
    const a = v.artwork;
    const artwork =
      a && typeof a.x === 'number' && typeof a.y === 'number' && typeof a.scale === 'number' ? clampArtwork(a) : null;
    return {
      parentProductId: v.parentProductId,
      size: v.size,
      colorName: typeof v.colorName === 'string' ? v.colorName : undefined,
      artwork,
    };
  } catch {
    return null;
  }
}
```

Note: `serializeDesign` omits the uploaded file; the artwork image lives only in component state (object URL) in Phase 1.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/customTee/domain/design.test.ts`
Expected: PASS. In the round-trip test `colorName: 'Black'` is preserved; confirm `toEqual` passes (undefined keys are ignored by `toEqual`).

- [ ] **Step 5: Commit**

```bash
git add src/features/customTee/domain/design.ts src/features/customTee/domain/design.test.ts
git commit -m "feat(custom-tee): design model, artwork clamping and file validation"
```

---

### Task 4: Data hook

**Files:**
- Create: `src/features/customTee/application/useCustomTeeData.ts`

**Interfaces:**
- Consumes: `fetchAllParentProducts(): Promise<ParentProduct[]>` from `@/features/catalog/infrastructure/firestoreParentProductsRepository`; `fetchAllProducts(): Promise<Product[]>` from `@/features/catalog/infrastructure/firestoreProductsRepository`.
- Produces: `useCustomTeeData(): { parents: ParentProduct[]; products: Product[]; loading: boolean; error: string | null; refreshParents: () => Promise<ParentProduct[]> }` — `refreshParents` refetches parents, updates state, and returns the fresh list for immediate revalidation.

- [ ] **Step 1: Write the hook**

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ParentProduct, Product } from '@/shared/domain/types';
import { fetchAllParentProducts } from '@/features/catalog/infrastructure/firestoreParentProductsRepository';
import { fetchAllProducts } from '@/features/catalog/infrastructure/firestoreProductsRepository';

export function useCustomTeeData() {
  const [parents, setParents] = useState<ParentProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAllParentProducts(), fetchAllProducts()])
      .then(([pp, prods]) => {
        if (cancelled) return;
        setParents(pp);
        setProducts(prods);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not load tees. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-reads stock; used before opening the studio and before saving.
  const refreshParents = useCallback(async () => {
    const fresh = await fetchAllParentProducts();
    setParents(fresh);
    return fresh;
  }, []);

  return { parents, products, loading, error, refreshParents };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from the new file.

- [ ] **Step 3: Commit**

```bash
git add src/features/customTee/application/useCustomTeeData.ts
git commit -m "feat(custom-tee): data hook with fresh-stock refresh"
```

---

### Task 5: Selection wizard UI

**Files:**
- Create: `src/features/customTee/presentation/ParentCard.tsx`
- Create: `src/features/customTee/presentation/SelectionWizard.tsx`

**Interfaces:**
- Consumes: domain from Tasks 1–2.
- Produces:
  - `ParentCard({ card: ParentCardData; size: string; selected: boolean; onSelect: () => void })`
  - `SelectionWizard({ parents: ParentProduct[]; products: Product[]; selection: Selection; onChange: (s: Selection) => void; onContinue: () => void; notice?: string | null; busy?: boolean })` — renders the four steps, preview panel, and the Continue button only when `isComplete(selection)`.

- [ ] **Step 1: Write `ParentCard.tsx`**

```tsx
'use client';

import type { ParentCardData } from '../domain/cards';

type Props = { card: ParentCardData; size: string; selected: boolean; onSelect: () => void };

export default function ParentCard({ card, size, selected, onSelect }: Props) {
  const { parent, code, photos, colors, stock } = card;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`text-left rounded-xl border p-3 bg-white transition-colors ${
        selected ? 'border-black ring-1 ring-black' : 'border-[#EEEEEE] hover:border-black'
      }`}
    >
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-[#F5F5F5]">
        {photos[0] ? (
          <img src={photos[0]} alt={parent.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wider text-[#717171]">No photo</div>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold text-black">{parent.name}</p>
      <p className="text-[10px] uppercase tracking-wider text-[#717171]">SKU: {code}</p>
      {colors.length > 0 && (
        <p className="mt-1 text-xs text-[#717171]">Colors: {colors.map((c) => c.name).join(', ')}</p>
      )}
      <p className="mt-2 text-xs text-black">
        Size {size}: {stock} pcs <span className="ml-1 font-semibold text-green-700">Available</span>
      </p>
    </button>
  );
}
```

- [ ] **Step 2: Write `SelectionWizard.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import type { ParentProduct, Product } from '@/shared/domain/types';
import {
  type Selection,
  eligibleCategories,
  eligibleSubcategories,
  eligibleSizes,
  eligibleParents,
  selectCategory,
  selectSubcategory,
  selectSize,
  selectParent,
  isComplete,
} from '../domain/selection';
import { buildParentCard } from '../domain/cards';
import ParentCard from './ParentCard';

type Props = {
  parents: ParentProduct[];
  products: Product[];
  selection: Selection;
  onChange: (s: Selection) => void;
  onContinue: () => void;
  notice?: string | null;
  busy?: boolean;
};

const FIELD =
  'w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-sm text-black focus:border-black focus:outline-none disabled:opacity-50';
const LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5';
const NOTE = 'rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]';

export default function SelectionWizard({ parents, products, selection, onChange, onContinue, notice, busy }: Props) {
  const [galleryIndex, setGalleryIndex] = useState(0);

  const categories = useMemo(() => eligibleCategories(parents), [parents]);
  const subcategories = useMemo(() => eligibleSubcategories(parents, selection.category), [parents, selection.category]);
  const sizes = useMemo(
    () => eligibleSizes(parents, selection.category, selection.subcategory),
    [parents, selection.category, selection.subcategory],
  );
  const matches = useMemo(
    () => eligibleParents(parents, selection.category, selection.subcategory, selection.size),
    [parents, selection.category, selection.subcategory, selection.size],
  );
  const cards = useMemo(() => matches.map((p) => buildParentCard(p, products, selection.size)), [matches, products, selection.size]);
  const chosen = cards.find((c) => c.parent.id === selection.parentId);
  const photo = chosen?.photos[galleryIndex] ?? chosen?.photos[0];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <h1 className="text-xl font-bold uppercase tracking-wider text-black">Design your tee</h1>
        {notice && <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">{notice}</p>}

        <div>
          <label className={LABEL} htmlFor="tee-category">1. Category</label>
          <select
            id="tee-category"
            className={FIELD}
            value={selection.category}
            onChange={(e) => { setGalleryIndex(0); onChange(selectCategory(selection, e.target.value)); }}
          >
            <option value="">Select a category</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {categories.length === 0 && <p className={`${NOTE} mt-2`}>No tees are available right now.</p>}
        </div>

        {selection.category && (
          <div>
            <label className={LABEL} htmlFor="tee-subcategory">2. Subcategory</label>
            <select
              id="tee-subcategory"
              className={FIELD}
              value={selection.subcategory}
              onChange={(e) => { setGalleryIndex(0); onChange(selectSubcategory(selection, e.target.value)); }}
            >
              <option value="">Select a subcategory</option>
              {subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {subcategories.length === 0 && (
              <p className={`${NOTE} mt-2`}>No subcategories with available stock in {selection.category} yet.</p>
            )}
          </div>
        )}

        {selection.subcategory && (
          <div>
            <span className={LABEL}>3. Size</span>
            {sizes.length === 0 ? (
              <p className={NOTE}>No matching tees have eligible stock in any size.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={selection.size === s}
                    onClick={() => { setGalleryIndex(0); onChange(selectSize(selection, s)); }}
                    className={`min-w-12 rounded-lg border px-4 py-2 text-sm font-semibold ${
                      selection.size === s ? 'border-black bg-black text-white' : 'border-[#EEEEEE] bg-white text-black hover:border-black'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selection.size && (
          <div>
            <span className={LABEL}>4. Parent product</span>
            {cards.length === 0 ? (
              <p className={NOTE}>No tees match this selection.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cards.map((card) => (
                  <ParentCard
                    key={card.parent.id}
                    card={card}
                    size={selection.size}
                    selected={card.parent.id === selection.parentId}
                    onSelect={() => { setGalleryIndex(0); onChange(selectParent(selection, card.parent.id)); }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {isComplete(selection) && (
          <button
            type="button"
            disabled={busy}
            onClick={onContinue}
            className="w-full rounded-lg bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#333333] disabled:opacity-50"
          >
            {busy ? 'Checking stock…' : 'Continue to Design Studio'}
          </button>
        )}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="aspect-square w-full overflow-hidden rounded-xl bg-[#F5F5F5]">
          {photo ? (
            <img src={photo} alt={chosen?.parent.name ?? 'Selected tee'} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-xs text-[#717171]">
              Choose a tee to preview it here.
            </div>
          )}
        </div>
        {chosen && chosen.photos.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {chosen.photos.map((url, i) => (
              <button
                key={url}
                type="button"
                aria-label={`Photo ${i + 1}`}
                onClick={() => setGalleryIndex(i)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border ${i === galleryIndex ? 'border-black' : 'border-[#EEEEEE]'}`}
              >
                <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/customTee/presentation/ParentCard.tsx src/features/customTee/presentation/SelectionWizard.tsx
git commit -m "feat(custom-tee): four-step selection wizard with image cards and preview"
```

---

### Task 6: Design Studio UI

**Files:**
- Create: `src/features/customTee/presentation/DesignStudio.tsx`

**Interfaces:**
- Consumes: `ParentCardData` (Task 2), `Artwork`, `Design`, `DEFAULT_ARTWORK`, `clampArtwork`, `validateArtworkFile` (Task 3).
- Produces: `DesignStudio({ card: ParentCardData; size: string; busy?: boolean; notice?: string | null; onBack: () => void; onSave: (design: Design, artworkUrl: string | null) => void })`.

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { ParentCardData } from '../domain/cards';
import { type Artwork, type Design, DEFAULT_ARTWORK, clampArtwork, validateArtworkFile } from '../domain/design';

type Props = {
  card: ParentCardData;
  size: string;
  busy?: boolean;
  notice?: string | null;
  onBack: () => void;
  onSave: (design: Design, artworkUrl: string | null) => void;
};

export default function DesignStudio({ card, size, busy, notice, onBack, onSave }: Props) {
  const { parent, colors, photos } = card;
  const [colorName, setColorName] = useState<string | undefined>(colors[0]?.name);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<Artwork>(DEFAULT_ARTWORK);
  const [fileError, setFileError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Revoke the object URL when it is replaced or the studio unmounts.
  useEffect(() => () => { if (artworkUrl) URL.revokeObjectURL(artworkUrl); }, [artworkUrl]);

  const activeColor = colors.find((c) => c.name === colorName);
  const baseImage = activeColor?.image || photos[0];

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const error = validateArtworkFile(file);
    setFileError(error);
    if (error) return;
    setArtworkUrl(URL.createObjectURL(file));
    setArtwork(DEFAULT_ARTWORK);
  };

  const moveTo = (clientX: number, clientY: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setArtwork((a) => clampArtwork({ ...a, x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height }));
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_340px]">
      <div>
        <div
          ref={boxRef}
          className="relative aspect-square w-full touch-none select-none overflow-hidden rounded-xl bg-[#F5F5F5]"
          onPointerMove={(e) => { if (dragging.current) moveTo(e.clientX, e.clientY); }}
          onPointerUp={() => { dragging.current = false; }}
          onPointerLeave={() => { dragging.current = false; }}
        >
          {baseImage ? (
            <img src={baseImage} alt={parent.name} className="h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[#717171]">No preview image</div>
          )}
          {artworkUrl && (
            <img
              src={artworkUrl}
              alt="Your artwork"
              draggable={false}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dragging.current = true; }}
              className="absolute cursor-grab active:cursor-grabbing"
              style={{
                left: `${artwork.x * 100}%`,
                top: `${artwork.y * 100}%`,
                width: `${artwork.scale * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <button type="button" onClick={onBack} className="text-[10px] font-bold uppercase tracking-widest text-[#717171] hover:text-black">
            ← Change tee
          </button>
          <h1 className="mt-2 text-lg font-bold text-black">{parent.name}</h1>
          <p className="text-xs text-[#717171]">Size {size} · SKU {card.code}</p>
        </div>

        {notice && <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">{notice}</p>}

        {colors.length > 0 && (
          <div>
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#717171]">Color</span>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  aria-label={c.name}
                  aria-pressed={c.name === colorName}
                  onClick={() => setColorName(c.name)}
                  className={`h-8 w-8 rounded-full border-2 ${c.name === colorName ? 'border-black' : 'border-[#EEEEEE]'}`}
                  style={{ backgroundColor: c.colorCode || '#d4d4d4' }}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-[#717171]">{colorName}</p>
          </div>
        )}

        <div>
          <label htmlFor="artwork-file" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#717171]">
            Artwork
          </label>
          <input
            id="artwork-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="block w-full text-xs"
          />
          {fileError && <p role="alert" className="mt-1 text-xs text-red-600">{fileError}</p>}
        </div>

        {artworkUrl && (
          <div>
            <label htmlFor="artwork-scale" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#717171]">
              Scale
            </label>
            <input
              id="artwork-scale"
              type="range"
              min={10}
              max={100}
              value={Math.round(artwork.scale * 100)}
              onChange={(e) => setArtwork((a) => clampArtwork({ ...a, scale: Number(e.target.value) / 100 }))}
              className="w-full"
            />
            <p className="mt-1 text-xs text-[#717171]">Drag the artwork on the tee to position it.</p>
          </div>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave({ parentProductId: parent.id, size, colorName, artwork: artworkUrl ? artwork : null }, artworkUrl)
          }
          className="w-full rounded-lg bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#333333] disabled:opacity-50"
        >
          {busy ? 'Checking stock…' : 'Save and continue'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/customTee/presentation/DesignStudio.tsx
git commit -m "feat(custom-tee): design studio with artwork upload, drag, scale and color switch"
```

---

### Task 7: Flow orchestration, summary, and route

**Files:**
- Create: `src/features/customTee/presentation/CustomTeeFlow.tsx`
- Create: `src/app/custom-tee/page.tsx`

**Interfaces:**
- Consumes: `useCustomTeeData` (Task 4), `SelectionWizard` (Task 5), `DesignStudio` (Task 6), `validateSelection`, `buildParentCard`, `serializeDesign`, `DESIGN_STORAGE_KEY`.
- Produces: default export `CustomTeeFlow` (no props); route `/custom-tee`.

- [ ] **Step 1: Write `CustomTeeFlow.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useCustomTeeData } from '../application/useCustomTeeData';
import { EMPTY_SELECTION, type Selection, type SelectionStep, validateSelection } from '../domain/selection';
import { buildParentCard } from '../domain/cards';
import { type Design, DESIGN_STORAGE_KEY, serializeDesign } from '../domain/design';
import SelectionWizard from './SelectionWizard';
import DesignStudio from './DesignStudio';

type Step = 'select' | 'studio' | 'summary';

// Clears the selection from the step that became invalid onward.
function truncateSelection(sel: Selection, resetTo: SelectionStep): Selection {
  const keep: Record<SelectionStep, (keyof Selection)[]> = {
    category: [],
    subcategory: ['category'],
    size: ['category', 'subcategory'],
    parent: ['category', 'subcategory', 'size'],
  };
  const next = { ...EMPTY_SELECTION };
  for (const k of keep[resetTo]) next[k] = sel[k];
  return next;
}

export default function CustomTeeFlow() {
  const { parents, products, loading, error, refreshParents } = useCustomTeeData();
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [step, setStep] = useState<Step>('select');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ design: Design; artworkUrl: string | null } | null>(null);

  const card = useMemo(() => {
    const parent = parents.find((p) => p.id === selection.parentId);
    return parent ? buildParentCard(parent, products, selection.size) : null;
  }, [parents, products, selection.parentId, selection.size]);

  // Re-reads stock; on failure returns to the selection step with a message.
  const revalidate = async (): Promise<boolean> => {
    setBusy(true);
    try {
      const fresh = await refreshParents();
      const result = validateSelection(fresh, selection);
      if (!result.ok) {
        setSelection(truncateSelection(selection, result.resetTo));
        setNotice(result.reason);
        setStep('select');
        return false;
      }
      setNotice(null);
      return true;
    } catch {
      setNotice('Could not check stock. Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openStudio = async () => {
    if (await revalidate()) setStep('studio');
  };

  const save = async (design: Design, artworkUrl: string | null) => {
    if (!(await revalidate())) return;
    sessionStorage.setItem(DESIGN_STORAGE_KEY, serializeDesign(design));
    setSaved({ design, artworkUrl });
    setStep('summary');
  };

  if (loading) return <p className="px-4 py-16 text-center text-sm text-[#717171]">Loading tees…</p>;
  if (error) return <p role="alert" className="px-4 py-16 text-center text-sm text-red-600">{error}</p>;

  if (step === 'studio' && card) {
    return (
      <DesignStudio card={card} size={selection.size} busy={busy} notice={notice} onBack={() => setStep('select')} onSave={save} />
    );
  }

  if (step === 'summary' && saved && card) {
    const { design, artworkUrl } = saved;
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-12">
        <h1 className="text-xl font-bold uppercase tracking-wider text-black">Design saved</h1>
        <ul className="space-y-1 text-sm text-black">
          <li>Tee: {card.parent.name} (SKU {card.code})</li>
          <li>Size: {design.size}</li>
          {design.colorName && <li>Color: {design.colorName}</li>}
          <li>Artwork: {design.artwork ? 'Added' : 'None'}</li>
        </ul>
        {artworkUrl && <img src={artworkUrl} alt="Your artwork" className="h-32 w-32 rounded-lg border border-[#EEEEEE] object-contain" />}
        {/* Phase 2: pricing and "Add to cart" attach here. */}
        <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">
          Ordering custom tees is coming soon. Your design is saved for this session.
        </p>
        <button type="button" onClick={() => setStep('studio')} className="text-xs font-bold uppercase tracking-widest text-black underline">
          Edit design
        </button>
      </div>
    );
  }

  return (
    <SelectionWizard
      parents={parents}
      products={products}
      selection={selection}
      onChange={(s) => { setNotice(null); setSelection(s); }}
      onContinue={openStudio}
      notice={notice}
      busy={busy}
    />
  );
}
```

- [ ] **Step 2: Write the route `src/app/custom-tee/page.tsx`**

```tsx
'use client';

import Navbar from '@/features/catalog/presentation/Navbar';
import CustomTeeFlow from '@/features/customTee/presentation/CustomTeeFlow';

export default function CustomTeeRoute() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <CustomTeeFlow />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and run all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass (existing suites plus the three new ones).

- [ ] **Step 4: Commit**

```bash
git add src/features/customTee/presentation/CustomTeeFlow.tsx src/app/custom-tee/page.tsx
git commit -m "feat(custom-tee): flow orchestration, saved-design summary and /custom-tee route"
```

---

### Task 8: Browser verification

**Files:** none (verification only; fix defects in the files above).

- [ ] **Step 1: Start the dev server** using the project's preview config (`.claude/launch.json`) or `npm run dev`, and open `/custom-tee`.

- [ ] **Step 2: Walk the happy path.** Pick category → subcategory → size → card. Expected: dropdowns only list options with stock; card shows photo, name, SKU, colors, "Size M: N pcs"; preview panel updates; Continue appears only after the card is selected.

- [ ] **Step 3: Check resets.** Change the category after a full selection. Expected: subcategory, size and card selection are cleared and Continue disappears.

- [ ] **Step 4: Check empty states.** Pick a category whose parents have no subcategory or stock. Expected: helpful messages, no empty grid.

- [ ] **Step 5: Exercise the studio.** Upload a PNG, drag it, move the scale slider, switch color, upload a PDF (expect the error message). Save. Expected: summary appears; `sessionStorage['custom-tee-design']` holds the design JSON (check via the browser console).

- [ ] **Step 6: Check stock revalidation.** Reduce the chosen parent's stock for that size to 0 in the admin (use a test parent, not live inventory) or stub the repository response, then click Continue. Expected: return to the selection with the amber notice and later steps cleared. Confirm no stock values changed as a result of selecting or saving.

- [ ] **Step 7: Check mobile width** (375px): layout stacks, cards 2-up, controls usable.

- [ ] **Step 8: Final checks and commit any fixes.**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean.

```bash
git add -A src docs
git commit -m "fix(custom-tee): issues found in browser verification"
```
(Skip the commit if nothing changed.)
