# Design Studio (Phase C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A full-page Design Studio at `/custom-tee/studio` (reference layout: tool rail + panel, canvas, product/controls panel) where a customer adds image and text layers onto the selected tee, with undo/redo, align/flip, zoom and save.

**Architecture:** All layer/history/design/target/view logic is pure and unit-tested in `src/features/customTee/domain/`. `useStudioState` wraps it in React state. A DOM-based `Canvas` renders the base image plus absolutely-positioned layers with pointer-driven move/scale/rotate. Panels are small presentational components; `StudioEditor` assembles them and `StudioPage` loads data and resolves the hand-off. The popup's Continue navigates to the studio.

**Tech Stack:** Next.js 15 app router, React 19, TypeScript, Tailwind 4, lucide-react, Vitest (node env, `src/**/*.test.ts`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-28-custom-tee-design-design.md`, section "Phase C: Design Studio".
- No migration, no schema change, no stock writes. Front view only (`buildViews` returns the parent/variant image as `front`).
- Storefront style: 8px border radius (`rounded-lg`; nested images `rounded-md`), border `#EEEEEE`, muted text `#717171`, black primary buttons `bg-black text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#333333]`. Dropdowns use the existing `Select` component (white panel).
- Layer model: `x`,`y` = center as fraction (0..1) of canvas width/height; `scale` clamped to 0.05..1.5 (`MIN_SCALE`/`MAX_SCALE`), image width = `scale` x canvas width, text font size = `scale * TEXT_FONT_FRACTION(0.2) * canvas width`; `rotation` degrees normalized to (-180, 180]; array order = z-order (last = top); default displayed scale % = `scale / 0.4 * 100`.
- Artwork files: PNG/JPEG/WebP only, max 10 MB, downscaled to max edge 1600px and stored as data URLs. Text max 60 chars. Max undo history 50.
- Storage keys: `sessionStorage['custom-tee-selection']` = `{"parentProductId","size"}` (existing), `sessionStorage['custom-tee-design']` = serialized `StudioDesign`.
- Free Gallery, price and Add to Cart are NOT implemented: show disabled "coming soon" states only.
- Work stays on branch `feat/custom-tee-design`; do not push or merge to main unless the user says so.
- Vitest only runs `src/**/*.test.ts`; component code is verified with `npx tsc --noEmit` and the browser.

## File Structure

- Create `src/features/customTee/domain/history.ts` (+ `history.test.ts`)
- Create `src/features/customTee/domain/layers.ts` (+ `layers.test.ts`)
- Create `src/features/customTee/domain/design.ts` (+ `design.test.ts`)
- Create `src/features/customTee/domain/studioTarget.ts` (+ `studioTarget.test.ts`)
- Create `src/features/customTee/domain/views.ts` (+ `views.test.ts`)
- Create `src/features/customTee/application/imageUpload.ts`
- Create `src/features/customTee/application/useStudioState.ts`
- Create `src/features/customTee/presentation/studio/Canvas.tsx`
- Create `src/features/customTee/presentation/studio/StudioToolbar.tsx`
- Create `src/features/customTee/presentation/studio/ToolRail.tsx`
- Create `src/features/customTee/presentation/studio/DesignPanel.tsx`
- Create `src/features/customTee/presentation/studio/ImagesPanel.tsx`
- Create `src/features/customTee/presentation/studio/TextPanel.tsx`
- Create `src/features/customTee/presentation/studio/LayersList.tsx`
- Create `src/features/customTee/presentation/studio/ProductPanel.tsx`
- Create `src/features/customTee/presentation/studio/PositionScalePanel.tsx`
- Create `src/features/customTee/presentation/studio/StudioEditor.tsx`
- Create `src/features/customTee/presentation/studio/StudioPage.tsx`
- Create `src/app/custom-tee/studio/page.tsx`
- Modify `src/features/customTee/presentation/CustomTeeModal.tsx` (navigate to the studio on Continue)

---

### Task 1: History (undo/redo) domain

**Files:**
- Create: `src/features/customTee/domain/history.ts`
- Test: `src/features/customTee/domain/history.test.ts`

**Interfaces:**
- Produces: `History<T>` = `{ past: T[]; present: T; future: T[]; pending: { base: T } | null }`; `HISTORY_LIMIT = 50`; `createHistory<T>(present: T): History<T>`; `live(h, next)`; `settle(h)`; `commit(h, next)`; `undo(h)`; `redo(h)`; `canUndo(h): boolean`; `canRedo(h): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createHistory, live, settle, commit, undo, redo, canUndo, canRedo, HISTORY_LIMIT } from './history';

describe('history', () => {
  it('commit pushes the previous present to past and clears future', () => {
    let h = createHistory(1);
    h = commit(h, 2);
    h = commit(h, 3);
    expect(h.present).toBe(3);
    expect(h.past).toEqual([1, 2]);
    expect(h.future).toEqual([]);
  });

  it('undo and redo walk the stack', () => {
    let h = commit(commit(createHistory(1), 2), 3);
    h = undo(h);
    expect(h.present).toBe(2);
    expect(h.future).toEqual([3]);
    h = undo(h);
    expect(h.present).toBe(1);
    h = redo(h);
    expect(h.present).toBe(2);
    h = redo(h);
    expect(h.present).toBe(3);
    expect(redo(h)).toEqual(h);
  });

  it('a new commit after undo clears the redo stack', () => {
    let h = undo(commit(createHistory(1), 2));
    h = commit(h, 5);
    expect(h.future).toEqual([]);
    expect(h.past).toEqual([1]);
  });

  it('live updates replace present without adding history until settled', () => {
    let h = createHistory(1);
    h = live(h, 2);
    h = live(h, 3);
    expect(h.present).toBe(3);
    expect(h.past).toEqual([]);
    h = settle(h);
    expect(h.past).toEqual([1]);
    expect(h.pending).toBeNull();
  });

  it('a settled gesture is a single undo step', () => {
    let h = settle(live(live(createHistory(1), 2), 3));
    h = undo(h);
    expect(h.present).toBe(1);
  });

  it('settling a gesture that changed nothing adds no history', () => {
    const h = settle(live(createHistory(1), 1));
    expect(h.past).toEqual([]);
  });

  it('undo settles a pending gesture first', () => {
    const h = undo(live(createHistory(1), 2));
    expect(h.present).toBe(1);
    expect(h.future).toEqual([2]);
  });

  it('reports canUndo / canRedo', () => {
    let h = createHistory(1);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
    h = live(h, 2);
    expect(canUndo(h)).toBe(true);
    h = undo(h);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(true);
  });

  it('caps past at HISTORY_LIMIT, dropping the oldest', () => {
    let h = createHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 10; i++) h = commit(h, i);
    expect(h.past.length).toBe(HISTORY_LIMIT);
    expect(h.past[0]).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/customTee/domain/history.test.ts`
Expected: FAIL — cannot resolve `./history`.

- [ ] **Step 3: Write minimal implementation**

```ts
export const HISTORY_LIMIT = 50;

export type History<T> = {
  past: T[];
  present: T;
  future: T[];
  /** Set while a gesture (e.g. a drag) is in progress: the value to push to `past` when it settles. */
  pending: { base: T } | null;
};

export const createHistory = <T,>(present: T): History<T> => ({ past: [], present, future: [], pending: null });

// Replaces the present without creating a history entry (used while dragging).
export function live<T>(h: History<T>, next: T): History<T> {
  return { ...h, present: next, pending: h.pending ?? { base: h.present } };
}

// Ends a gesture: the whole gesture becomes one undo step (nothing if it changed nothing).
export function settle<T>(h: History<T>): History<T> {
  if (!h.pending) return h;
  if (Object.is(h.pending.base, h.present)) return { ...h, pending: null };
  return { past: [...h.past, h.pending.base].slice(-HISTORY_LIMIT), present: h.present, future: [], pending: null };
}

// A discrete change: one undo step.
export const commit = <T,>(h: History<T>, next: T): History<T> => settle(live(h, next));

export function undo<T>(h: History<T>): History<T> {
  const s = settle(h);
  if (s.past.length === 0) return s;
  const previous = s.past[s.past.length - 1];
  return { past: s.past.slice(0, -1), present: previous, future: [s.present, ...s.future], pending: null };
}

export function redo<T>(h: History<T>): History<T> {
  const s = settle(h);
  if (s.future.length === 0) return s;
  const [next, ...rest] = s.future;
  return { past: [...s.past, s.present], present: next, future: rest, pending: null };
}

export const canUndo = <T,>(h: History<T>): boolean =>
  h.past.length > 0 || (h.pending !== null && !Object.is(h.pending.base, h.present));

export const canRedo = <T,>(h: History<T>): boolean => h.future.length > 0;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/customTee/domain/history.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/customTee/domain/history.ts src/features/customTee/domain/history.test.ts
git commit -m "feat(custom-tee): undo/redo history domain"
```

---

### Task 2: Layers domain

**Files:**
- Create: `src/features/customTee/domain/layers.ts`
- Test: `src/features/customTee/domain/layers.test.ts`

**Interfaces:**
- Produces (all exported from `layers.ts`):
  - Types: `LayerBase`, `ImageLayer` (`type:'image'`, `src`, `aspect`), `TextLayer` (`type:'text'`, `text`, `fontFamily`, `color`), `Layer`, `LayerPatch`, `AlignEdge` (`'left'|'center'|'right'|'top'|'middle'|'bottom'`).
  - Constants: `MIN_SCALE=0.05`, `MAX_SCALE=1.5`, `DEFAULT_SCALE=0.4`, `TEXT_FONT_FRACTION=0.2`, `MAX_TEXT_LENGTH=60`, `DEFAULT_TEXT_COLOR='#111111'`, `FONT_OPTIONS: readonly {label:string; family:string}[]`.
  - Functions: `normalizeRotation(deg)`, `clampLayer(layer)`, `createImageLayer({id,name,src,aspect})`, `createTextLayer({id,text,fontFamily?,color?})`, `addLayer(layers, layer)`, `removeLayer(layers,id)`, `updateLayer(layers,id,patch)`, `toggleVisible(layers,id)`, `flipLayer(layers,id,axis:'x'|'y')`, `moveLayer(layers,id,direction:'up'|'down')`, `reorderLayer(layers,id,toIndex)`, `alignLayer(layer,size:{w:number;h:number},edge): LayerPatch`, `scaleToPercent(scale)`, `percentToScale(percent)`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  type Layer,
  MIN_SCALE,
  MAX_SCALE,
  DEFAULT_SCALE,
  FONT_OPTIONS,
  DEFAULT_TEXT_COLOR,
  normalizeRotation,
  clampLayer,
  createImageLayer,
  createTextLayer,
  addLayer,
  removeLayer,
  updateLayer,
  toggleVisible,
  flipLayer,
  moveLayer,
  reorderLayer,
  alignLayer,
  scaleToPercent,
  percentToScale,
} from './layers';

const img = (id: string) => createImageLayer({ id, name: `${id}.png`, src: 'data:image/png;base64,AAAA', aspect: 1.5 });
const ids = (layers: Layer[]) => layers.map((l) => l.id);

describe('normalizeRotation', () => {
  it('wraps into (-180, 180]', () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(190)).toBe(-170);
    expect(normalizeRotation(-190)).toBe(170);
    expect(normalizeRotation(180)).toBe(180);
    expect(normalizeRotation(-180)).toBe(180);
    expect(normalizeRotation(360)).toBe(0);
  });
});

describe('create + clamp', () => {
  it('creates an image layer with defaults', () => {
    const l = img('a');
    expect(l).toMatchObject({ type: 'image', id: 'a', scale: DEFAULT_SCALE, rotation: 0, flipX: false, flipY: false, visible: true, aspect: 1.5 });
    expect(l.x).toBeGreaterThan(0);
    expect(l.x).toBeLessThan(1);
  });
  it('creates a text layer with defaults', () => {
    const l = createTextLayer({ id: 't', text: 'Hello' });
    expect(l).toMatchObject({ type: 'text', text: 'Hello', name: 'Hello', color: DEFAULT_TEXT_COLOR, fontFamily: FONT_OPTIONS[0].family });
  });
  it('clamps position, scale and rotation', () => {
    const c = clampLayer({ ...img('a'), x: -1, y: 2, scale: 9, rotation: 270 });
    expect(c).toMatchObject({ x: 0, y: 1, scale: MAX_SCALE, rotation: -90 });
    expect(clampLayer({ ...img('a'), scale: 0 }).scale).toBe(MIN_SCALE);
  });
});

describe('list operations', () => {
  const base = [img('a'), img('b'), img('c')];
  it('adds on top and removes', () => {
    expect(ids(addLayer(base, img('d')))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(removeLayer(base, 'b'))).toEqual(['a', 'c']);
  });
  it('updates with clamping and only touches matching fields', () => {
    const out = updateLayer([...base, createTextLayer({ id: 't', text: 'Hi' })], 't', { scale: 99, text: 'Yo', src: 'ignored' });
    const t = out.find((l) => l.id === 't')!;
    expect(t).toMatchObject({ type: 'text', text: 'Yo', scale: MAX_SCALE });
    expect('src' in t).toBe(false);
    expect(updateLayer(base, 'a', { text: 'nope' }).find((l) => l.id === 'a')).not.toHaveProperty('text');
  });
  it('toggles visibility and flips', () => {
    expect(toggleVisible(base, 'a')[0].visible).toBe(false);
    expect(flipLayer(base, 'a', 'x')[0].flipX).toBe(true);
    expect(flipLayer(base, 'a', 'y')[0].flipY).toBe(true);
  });
  it('moves up (toward top) and down, no-op at the edges', () => {
    expect(ids(moveLayer(base, 'b', 'up'))).toEqual(['a', 'c', 'b']);
    expect(ids(moveLayer(base, 'b', 'down'))).toEqual(['b', 'a', 'c']);
    expect(ids(moveLayer(base, 'c', 'up'))).toEqual(['a', 'b', 'c']);
    expect(ids(moveLayer(base, 'a', 'down'))).toEqual(['a', 'b', 'c']);
  });
  it('reorders to an index, clamped', () => {
    expect(ids(reorderLayer(base, 'a', 2))).toEqual(['b', 'c', 'a']);
    expect(ids(reorderLayer(base, 'c', 0))).toEqual(['c', 'a', 'b']);
    expect(ids(reorderLayer(base, 'a', 99))).toEqual(['b', 'c', 'a']);
  });
});

describe('alignLayer', () => {
  const layer = { ...img('a'), x: 0.3, y: 0.7 };
  const size = { w: 0.4, h: 0.2 };
  it('aligns to canvas edges using the layer box', () => {
    expect(alignLayer(layer, size, 'left').x).toBeCloseTo(0.2);
    expect(alignLayer(layer, size, 'center').x).toBeCloseTo(0.5);
    expect(alignLayer(layer, size, 'right').x).toBeCloseTo(0.8);
    expect(alignLayer(layer, size, 'top').y).toBeCloseTo(0.1);
    expect(alignLayer(layer, size, 'middle').y).toBeCloseTo(0.5);
    expect(alignLayer(layer, size, 'bottom').y).toBeCloseTo(0.9);
  });
  it('only changes the aligned axis', () => {
    expect(alignLayer(layer, size, 'left')).not.toHaveProperty('y');
    expect(alignLayer(layer, size, 'top')).not.toHaveProperty('x');
  });
});

describe('scale percent', () => {
  it('maps the default scale to 100% and round-trips', () => {
    expect(scaleToPercent(DEFAULT_SCALE)).toBe(100);
    expect(percentToScale(100)).toBeCloseTo(DEFAULT_SCALE);
    expect(percentToScale(scaleToPercent(0.2))).toBeCloseTo(0.2, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/customTee/domain/layers.test.ts`
Expected: FAIL — cannot resolve `./layers`.

- [ ] **Step 3: Write minimal implementation**

```ts
export type LayerBase = {
  id: string;
  name: string;
  /** Center, as a fraction (0..1) of the canvas width. */
  x: number;
  /** Center, as a fraction (0..1) of the canvas height. */
  y: number;
  /** Image: layer width as a fraction of canvas width. Text: font size = scale * TEXT_FONT_FRACTION * canvas width. */
  scale: number;
  /** Degrees, normalized to (-180, 180]. */
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  visible: boolean;
};

export type ImageLayer = LayerBase & { type: 'image'; src: string; aspect: number };
export type TextLayer = LayerBase & { type: 'text'; text: string; fontFamily: string; color: string };
export type Layer = ImageLayer | TextLayer;

export type LayerPatch = Partial<Omit<LayerBase, 'id'>> & {
  src?: string;
  aspect?: number;
  text?: string;
  fontFamily?: string;
  color?: string;
};

export type AlignEdge = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 1.5;
export const DEFAULT_SCALE = 0.4;
export const TEXT_FONT_FRACTION = 0.2;
export const MAX_TEXT_LENGTH = 60;
export const DEFAULT_TEXT_COLOR = '#111111';

export const FONT_OPTIONS = [
  { label: 'Sans', family: 'Arial, Helvetica, sans-serif' },
  { label: 'Serif', family: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono', family: '"Courier New", Courier, monospace' },
  { label: 'Impact', family: 'Impact, "Arial Black", sans-serif' },
  { label: 'Script', family: '"Brush Script MT", "Segoe Script", cursive' },
] as const;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function normalizeRotation(deg: number): number {
  const r = ((((deg + 180) % 360) + 360) % 360) - 180;
  return r === -180 ? 180 : r;
}

export function clampLayer<T extends Layer>(layer: T): T {
  return {
    ...layer,
    x: clamp(layer.x, 0, 1),
    y: clamp(layer.y, 0, 1),
    scale: clamp(layer.scale, MIN_SCALE, MAX_SCALE),
    rotation: normalizeRotation(layer.rotation),
  };
}

const baseDefaults = { x: 0.5, y: 0.45, scale: DEFAULT_SCALE, rotation: 0, flipX: false, flipY: false, visible: true };

export function createImageLayer(init: { id: string; name: string; src: string; aspect: number }): ImageLayer {
  return { ...baseDefaults, type: 'image', ...init };
}

export function createTextLayer(init: { id: string; text: string; fontFamily?: string; color?: string }): TextLayer {
  return {
    ...baseDefaults,
    type: 'text',
    id: init.id,
    name: init.text.slice(0, 24) || 'Text',
    text: init.text,
    fontFamily: init.fontFamily ?? FONT_OPTIONS[0].family,
    color: init.color ?? DEFAULT_TEXT_COLOR,
  };
}

export const addLayer = (layers: Layer[], layer: Layer): Layer[] => [...layers, layer];
export const removeLayer = (layers: Layer[], id: string): Layer[] => layers.filter((l) => l.id !== id);

export function updateLayer(layers: Layer[], id: string, patch: LayerPatch): Layer[] {
  const { src, aspect, text, fontFamily, color, ...base } = patch;
  return layers.map((l) => {
    if (l.id !== id) return l;
    if (l.type === 'image') {
      return clampLayer({ ...l, ...base, ...(src !== undefined ? { src } : {}), ...(aspect !== undefined ? { aspect } : {}) });
    }
    return clampLayer({
      ...l,
      ...base,
      ...(text !== undefined ? { text } : {}),
      ...(fontFamily !== undefined ? { fontFamily } : {}),
      ...(color !== undefined ? { color } : {}),
    });
  });
}

export const toggleVisible = (layers: Layer[], id: string): Layer[] =>
  layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));

export const flipLayer = (layers: Layer[], id: string, axis: 'x' | 'y'): Layer[] =>
  layers.map((l) => (l.id === id ? (axis === 'x' ? { ...l, flipX: !l.flipX } : { ...l, flipY: !l.flipY }) : l));

// 'up' moves toward the top of the stack (later in the array).
export function moveLayer(layers: Layer[], id: string, direction: 'up' | 'down'): Layer[] {
  const i = layers.findIndex((l) => l.id === id);
  const j = direction === 'up' ? i + 1 : i - 1;
  if (i < 0 || j < 0 || j >= layers.length) return layers;
  const next = layers.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function reorderLayer(layers: Layer[], id: string, toIndex: number): Layer[] {
  const i = layers.findIndex((l) => l.id === id);
  if (i < 0) return layers;
  const next = layers.slice();
  const [moved] = next.splice(i, 1);
  next.splice(clamp(toIndex, 0, next.length), 0, moved);
  return next;
}

// `size` is the layer's unrotated box as fractions of the canvas width/height.
export function alignLayer(layer: Layer, size: { w: number; h: number }, edge: AlignEdge): LayerPatch {
  switch (edge) {
    case 'left':
      return { x: size.w / 2 };
    case 'center':
      return { x: 0.5 };
    case 'right':
      return { x: 1 - size.w / 2 };
    case 'top':
      return { y: size.h / 2 };
    case 'middle':
      return { y: 0.5 };
    case 'bottom':
      return { y: 1 - size.h / 2 };
  }
}

export const scaleToPercent = (scale: number): number => Math.round((scale / DEFAULT_SCALE) * 100);
export const percentToScale = (percent: number): number => (percent / 100) * DEFAULT_SCALE;
```

Note: `alignLayer` takes `layer` for a consistent signature even though only `size` is used; keep the parameter (the caller passes it) and prefix is not required because TypeScript's `noUnusedParameters` is not enabled in this repo (verify with `npx tsc --noEmit`; if it errors, rename the parameter to `_layer`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/customTee/domain/layers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/customTee/domain/layers.ts src/features/customTee/domain/layers.test.ts
git commit -m "feat(custom-tee): layer model, clamping, ordering, align/flip"
```

---

### Task 3: Design, target and views domain

**Files:**
- Create: `src/features/customTee/domain/design.ts`, `studioTarget.ts`, `views.ts`
- Test: `design.test.ts`, `studioTarget.test.ts`, `views.test.ts` (same folder)

**Interfaces:**
- Consumes: Task 2 layers module; existing `selectableParents` from `./selection`; `ParentProduct`, `ProductVariant` from `@/shared/domain/types`.
- Produces:
  - `design.ts`: `StudioDesign = { parentProductId: string; size: string; colorName?: string; layers: Layer[] }`, `DESIGN_STORAGE_KEY = 'custom-tee-design'`, `MAX_ARTWORK_BYTES = 10 * 1024 * 1024`, `validateArtworkFile(file: {type: string; size: number}): string | null`, `serializeDesign(d): string`, `parseDesign(raw: string | null): StudioDesign | null`.
  - `studioTarget.ts`: `HANDOFF_KEY = 'custom-tee-selection'`, `Handoff = { parentProductId: string; size: string }`, `parseHandoff(raw: string | null): Handoff | null`, `handoffFromParams(tee: string | null, size: string | null): Handoff | null`, `resolveStudioTarget(parents: ParentProduct[], handoff: Handoff | null): ParentProduct | null`.
  - `views.ts`: `ViewId = 'front'|'back'|'left'|'right'`, `StudioView = { id: ViewId; label: string; image: string }`, `buildViews(parent: ParentProduct, color?: ProductVariant): StudioView[]`.

- [ ] **Step 1: Write the failing tests**

`design.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createImageLayer, createTextLayer, FONT_OPTIONS, DEFAULT_TEXT_COLOR } from './layers';
import { validateArtworkFile, serializeDesign, parseDesign, MAX_ARTWORK_BYTES, type StudioDesign } from './design';

describe('validateArtworkFile', () => {
  it('accepts png/jpeg/webp up to 10 MB', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) expect(validateArtworkFile({ type, size: 1000 })).toBeNull();
    expect(validateArtworkFile({ type: 'image/png', size: MAX_ARTWORK_BYTES })).toBeNull();
  });
  it('rejects other types and oversized files', () => {
    expect(validateArtworkFile({ type: 'application/pdf', size: 10 })).toMatch(/PNG, JPG or WebP/);
    expect(validateArtworkFile({ type: 'image/svg+xml', size: 10 })).toMatch(/PNG, JPG or WebP/);
    expect(validateArtworkFile({ type: 'image/png', size: MAX_ARTWORK_BYTES + 1 })).toMatch(/10 MB/);
  });
});

describe('design serialization', () => {
  const design: StudioDesign = {
    parentProductId: 'p1',
    size: 'M',
    colorName: 'Black',
    layers: [
      createImageLayer({ id: 'i', name: 'a.png', src: 'data:image/png;base64,AAAA', aspect: 2 }),
      createTextLayer({ id: 't', text: 'Hi', fontFamily: FONT_OPTIONS[1].family, color: '#ff0000' }),
    ],
  };
  it('round-trips a design', () => {
    expect(parseDesign(serializeDesign(design))).toEqual(design);
  });
  it('returns null for null, junk or structurally invalid input', () => {
    expect(parseDesign(null)).toBeNull();
    expect(parseDesign('{nope')).toBeNull();
    expect(parseDesign(JSON.stringify({ size: 'M' }))).toBeNull();
  });
  it('drops invalid layers and sanitizes text layer fields', () => {
    const raw = JSON.stringify({
      parentProductId: 'p1',
      size: 'M',
      layers: [
        { ...design.layers[0], src: 'https://evil.example/x.png' }, // only data:image/ sources are allowed
        { ...design.layers[0], id: 'bad-aspect', aspect: 0 },
        { ...design.layers[1], color: 'url(javascript:alert(1))', fontFamily: 'Comic Sans' },
        { type: 'text', id: 'empty', name: 'x', text: '', x: 0.5, y: 0.5, scale: 0.4, rotation: 0 },
        'garbage',
      ],
    });
    const parsed = parseDesign(raw)!;
    expect(parsed.layers).toHaveLength(1);
    expect(parsed.layers[0]).toMatchObject({ type: 'text', color: DEFAULT_TEXT_COLOR, fontFamily: FONT_OPTIONS[0].family });
  });
  it('clamps out-of-range layer numbers', () => {
    const raw = JSON.stringify({ parentProductId: 'p', size: 'M', layers: [{ ...design.layers[0], x: 5, scale: 99 }] });
    expect(parseDesign(raw)!.layers[0]).toMatchObject({ x: 1, scale: 1.5 });
  });
});
```

`studioTarget.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import type { ParentProduct } from '@/shared/domain/types';
import { parseHandoff, handoffFromParams, resolveStudioTarget } from './studioTarget';

const parent = (id: string, image: string, stock: Record<string, number>): ParentProduct => ({
  id, name: id, image, category: 'T-Shirt', subcategory: 'Adult', sizeOrder: Object.keys(stock), stockBySize: stock,
});

describe('handoff parsing', () => {
  it('parses stored JSON and rejects junk', () => {
    expect(parseHandoff('{"parentProductId":"a","size":"M"}')).toEqual({ parentProductId: 'a', size: 'M' });
    expect(parseHandoff(null)).toBeNull();
    expect(parseHandoff('{bad')).toBeNull();
    expect(parseHandoff('{"size":"M"}')).toBeNull();
  });
  it('builds from query params', () => {
    expect(handoffFromParams('a', 'M')).toEqual({ parentProductId: 'a', size: 'M' });
    expect(handoffFromParams(null, 'M')).toBeNull();
    expect(handoffFromParams('a', '')).toBeNull();
  });
});

describe('resolveStudioTarget', () => {
  const parents = [parent('a', 'a.jpg', { M: 3, L: 0 }), parent('b', '', { M: 5 })];
  it('returns the imaged parent that has stock in the size', () => {
    expect(resolveStudioTarget(parents, { parentProductId: 'a', size: 'M' })?.id).toBe('a');
  });
  it('returns null when stock is 0, the parent has no image, is missing, or there is no hand-off', () => {
    expect(resolveStudioTarget(parents, { parentProductId: 'a', size: 'L' })).toBeNull();
    expect(resolveStudioTarget(parents, { parentProductId: 'b', size: 'M' })).toBeNull();
    expect(resolveStudioTarget(parents, { parentProductId: 'zzz', size: 'M' })).toBeNull();
    expect(resolveStudioTarget(parents, null)).toBeNull();
  });
});
```

`views.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import type { ParentProduct } from '@/shared/domain/types';
import { buildViews } from './views';

const parent: ParentProduct = { id: 'p', name: 'Tee', image: 'p.jpg', category: 'T', sizeOrder: ['M'], stockBySize: { M: 1 } };

describe('buildViews', () => {
  it('returns only the front view from the parent image', () => {
    expect(buildViews(parent)).toEqual([{ id: 'front', label: 'Front', image: 'p.jpg' }]);
  });
  it('prefers the selected color variant image', () => {
    expect(buildViews(parent, { id: 'v', name: 'Black', image: 'black.jpg' })[0].image).toBe('black.jpg');
    expect(buildViews(parent, { id: 'v', name: 'Black' })[0].image).toBe('p.jpg');
  });
  it('returns no views when there is no image at all', () => {
    expect(buildViews({ ...parent, image: '' })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/customTee/domain/design.test.ts src/features/customTee/domain/studioTarget.test.ts src/features/customTee/domain/views.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write implementations**

`design.ts`:
```ts
import { type Layer, FONT_OPTIONS, DEFAULT_TEXT_COLOR, MAX_TEXT_LENGTH, clampLayer } from './layers';

export type StudioDesign = {
  parentProductId: string;
  size: string;
  colorName?: string;
  layers: Layer[];
};

export const DESIGN_STORAGE_KEY = 'custom-tee-design';
export const MAX_ARTWORK_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function validateArtworkFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Please upload a PNG, JPG or WebP image.';
  if (file.size > MAX_ARTWORK_BYTES) return 'Artwork must be 10 MB or smaller.';
  return null;
}

export const serializeDesign = (d: StudioDesign): string => JSON.stringify(d);

// Validates untrusted (sessionStorage) data: only data:image sources, known fonts, hex colors.
function parseLayer(v: unknown): Layer | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id || typeof o.name !== 'string') return null;
  if (!isNum(o.x) || !isNum(o.y) || !isNum(o.scale) || !isNum(o.rotation)) return null;
  const base = {
    id: o.id,
    name: o.name.slice(0, 80),
    x: o.x,
    y: o.y,
    scale: o.scale,
    rotation: o.rotation,
    flipX: o.flipX === true,
    flipY: o.flipY === true,
    visible: o.visible !== false,
  };
  if (o.type === 'image') {
    if (typeof o.src !== 'string' || !o.src.startsWith('data:image/') || !isNum(o.aspect) || o.aspect <= 0) return null;
    return clampLayer({ ...base, type: 'image' as const, src: o.src, aspect: o.aspect });
  }
  if (o.type === 'text') {
    if (typeof o.text !== 'string' || !o.text || o.text.length > MAX_TEXT_LENGTH) return null;
    const family = FONT_OPTIONS.find((f) => f.family === o.fontFamily)?.family ?? FONT_OPTIONS[0].family;
    const color = typeof o.color === 'string' && HEX_COLOR.test(o.color) ? o.color : DEFAULT_TEXT_COLOR;
    return clampLayer({ ...base, type: 'text' as const, text: o.text, fontFamily: family, color });
  }
  return null;
}

export function parseDesign(raw: string | null): StudioDesign | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v.parentProductId !== 'string' || typeof v.size !== 'string') return null;
    const layers = Array.isArray(v.layers) ? v.layers.map(parseLayer).filter((l: Layer | null): l is Layer => l !== null) : [];
    return {
      parentProductId: v.parentProductId,
      size: v.size,
      colorName: typeof v.colorName === 'string' ? v.colorName : undefined,
      layers,
    };
  } catch {
    return null;
  }
}
```

`studioTarget.ts`:
```ts
import type { ParentProduct } from '@/shared/domain/types';
import { selectableParents } from './selection';

export const HANDOFF_KEY = 'custom-tee-selection';

export type Handoff = { parentProductId: string; size: string };

export function parseHandoff(raw: string | null): Handoff | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v.parentProductId !== 'string' || !v.parentProductId || typeof v.size !== 'string' || !v.size) return null;
    return { parentProductId: v.parentProductId, size: v.size };
  } catch {
    return null;
  }
}

export function handoffFromParams(tee: string | null, size: string | null): Handoff | null {
  return tee && size ? { parentProductId: tee, size } : null;
}

// The imaged parent named by the hand-off that still has stock in that size.
export function resolveStudioTarget(parents: ParentProduct[], handoff: Handoff | null): ParentProduct | null {
  if (!handoff) return null;
  return (
    selectableParents(parents).find((p) => p.id === handoff.parentProductId && (p.stockBySize[handoff.size] ?? 0) > 0) ?? null
  );
}
```

`views.ts`:
```ts
import type { ParentProduct, ProductVariant } from '@/shared/domain/types';

export type ViewId = 'front' | 'back' | 'left' | 'right';
export type StudioView = { id: ViewId; label: string; image: string };

// Front only until parents carry back/left/right images (phase B); callers render tabs from this list.
export function buildViews(parent: ParentProduct, color?: ProductVariant): StudioView[] {
  const image = color?.image || parent.image || '';
  return image ? [{ id: 'front', label: 'Front', image }] : [];
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/features/customTee/domain && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/customTee/domain/design.ts src/features/customTee/domain/design.test.ts src/features/customTee/domain/studioTarget.ts src/features/customTee/domain/studioTarget.test.ts src/features/customTee/domain/views.ts src/features/customTee/domain/views.test.ts
git commit -m "feat(custom-tee): design serialization, studio target resolution and views"
```

---

### Task 4: Image upload util and studio state hook

**Files:**
- Create: `src/features/customTee/application/imageUpload.ts`
- Create: `src/features/customTee/application/useStudioState.ts`

**Interfaces:**
- Consumes: Task 1 history functions, Task 2 layer functions.
- Produces:
  - `fileToDataUrl(file: File, maxEdge?: number): Promise<{ src: string; aspect: number }>` (default `maxEdge` 1600).
  - `Asset = { id: string; name: string; src: string; aspect: number }`.
  - `useStudioState(initialLayers: Layer[])` returning `{ layers: Layer[]; selectedId: string | null; selected: Layer | null; assets: Asset[]; canUndo: boolean; canRedo: boolean; select(id: string | null): void; rememberAsset(a: Omit<Asset,'id'>): Asset; addImage(a: Asset): void; addText(text: string, fontFamily: string, color: string): void; patch(id: string, p: LayerPatch): void; patchLive(id: string, p: LayerPatch): void; settleGesture(): void; remove(id: string): void; toggle(id: string): void; flip(id: string, axis: 'x'|'y'): void; align(id: string, size: {w:number;h:number}, edge: AlignEdge): void; move(id: string, dir: 'up'|'down'): void; reorder(id: string, toIndex: number): void; undo(): void; redo(): void }`.

- [ ] **Step 1: Write `imageUpload.ts`**

```ts
// Reads an image file, downscales it so its longest edge is at most `maxEdge`, and returns a data URL.
// PNG/WebP are re-encoded as PNG (keeps transparency); JPEG stays JPEG.
export async function fileToDataUrl(file: File, maxEdge = 1600): Promise<{ src: string; aspect: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read that image.'));
      el.src = url;
    });
    const ratio = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * ratio));
    const height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process that image.');
    ctx.drawImage(img, 0, 0, width, height);
    const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    return { src: canvas.toDataURL(type, 0.9), aspect: width / height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

- [ ] **Step 2: Write `useStudioState.ts`**

```ts
'use client';

import { useCallback, useRef, useState } from 'react';
import { type History, createHistory, live, settle, commit, undo as undoH, redo as redoH, canUndo, canRedo } from '../domain/history';
import {
  type AlignEdge,
  type Layer,
  type LayerPatch,
  addLayer,
  alignLayer,
  createImageLayer,
  createTextLayer,
  flipLayer,
  moveLayer,
  removeLayer,
  reorderLayer,
  toggleVisible,
  updateLayer,
} from '../domain/layers';

export type Asset = { id: string; name: string; src: string; aspect: number };

export function useStudioState(initialLayers: Layer[]) {
  const [history, setHistory] = useState<History<Layer[]>>(() => createHistory(initialLayers));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const counter = useRef(0);
  const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${counter.current++}`;

  const layers = history.present;
  const selected = layers.find((l) => l.id === selectedId) ?? null;

  const change = useCallback((fn: (ls: Layer[]) => Layer[]) => setHistory((h) => commit(h, fn(h.present))), []);

  const rememberAsset = useCallback((a: Omit<Asset, 'id'>): Asset => {
    const asset = { ...a, id: `asset-${Date.now().toString(36)}-${counter.current++}` };
    setAssets((prev) => [...prev, asset]);
    return asset;
  }, []);

  const addImage = useCallback((a: Asset) => {
    const layer = createImageLayer({ id: nextId('layer'), name: a.name, src: a.src, aspect: a.aspect });
    setHistory((h) => commit(h, addLayer(h.present, layer)));
    setSelectedId(layer.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addText = useCallback((text: string, fontFamily: string, color: string) => {
    const layer = createTextLayer({ id: nextId('layer'), text, fontFamily, color });
    setHistory((h) => commit(h, addLayer(h.present, layer)));
    setSelectedId(layer.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    layers,
    selectedId,
    selected,
    assets,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    select: setSelectedId,
    rememberAsset,
    addImage,
    addText,
    patch: (id: string, p: LayerPatch) => change((ls) => updateLayer(ls, id, p)),
    patchLive: (id: string, p: LayerPatch) => setHistory((h) => live(h, updateLayer(h.present, id, p))),
    settleGesture: () => setHistory((h) => settle(h)),
    remove: (id: string) => {
      change((ls) => removeLayer(ls, id));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    toggle: (id: string) => change((ls) => toggleVisible(ls, id)),
    flip: (id: string, axis: 'x' | 'y') => change((ls) => flipLayer(ls, id, axis)),
    align: (id: string, size: { w: number; h: number }, edge: AlignEdge) =>
      setHistory((h) => {
        const layer = h.present.find((l) => l.id === id);
        return layer ? commit(h, updateLayer(h.present, id, alignLayer(layer, size, edge))) : h;
      }),
    move: (id: string, dir: 'up' | 'down') => change((ls) => moveLayer(ls, id, dir)),
    reorder: (id: string, toIndex: number) => change((ls) => reorderLayer(ls, id, toIndex)),
    undo: () => setHistory((h) => undoH(h)),
    redo: () => setHistory((h) => redoH(h)),
  };
}
```

- [ ] **Step 3: Typecheck and run all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/customTee/application/imageUpload.ts src/features/customTee/application/useStudioState.ts
git commit -m "feat(custom-tee): image upload util and studio state hook"
```

---

### Task 5: Canvas and toolbar

**Files:**
- Create: `src/features/customTee/presentation/studio/Canvas.tsx`
- Create: `src/features/customTee/presentation/studio/StudioToolbar.tsx`

**Interfaces:**
- Consumes: `Layer`, `LayerPatch`, `TEXT_FONT_FRACTION` from `../../domain/layers`; `StudioView` from `../../domain/views`.
- Produces:
  - `Canvas({ baseImage?: string; baseAlt: string; layers: Layer[]; selectedId: string | null; zoom: number; onSelect(id: string | null): void; onLiveChange(id: string, patch: LayerPatch): void; onSettle(): void; onSelectedSize(size: {w: number; h: number} | null): void })`. `zoom` is a multiplier (1 = 100%); the canvas width is `520 * zoom` px (max 100% of its container when `zoom <= 1`). `onSelectedSize` reports the selected layer's unrotated box as fractions of the canvas size (for align).
  - `StudioToolbar({ canUndo, canRedo, onUndo, onRedo, views: StudioView[], activeView: string, onView(id: string): void, zoom: number, onZoom(next: number): void, fullscreen: boolean, onFullscreen(): void })` — zoom steps 0.25 between 0.5 and 2.

- [ ] **Step 1: Write `Canvas.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { type Layer, type LayerPatch, TEXT_FONT_FRACTION } from '../../domain/layers';

type Props = {
  baseImage?: string;
  baseAlt: string;
  layers: Layer[];
  selectedId: string | null;
  zoom: number;
  onSelect: (id: string | null) => void;
  onLiveChange: (id: string, patch: LayerPatch) => void;
  onSettle: () => void;
  onSelectedSize: (size: { w: number; h: number } | null) => void;
};

type Drag =
  | { kind: 'move'; id: string; startNx: number; startNy: number; x: number; y: number }
  | { kind: 'scale'; id: string; cx: number; cy: number; startDist: number; scale: number }
  | { kind: 'rotate'; id: string; cx: number; cy: number; startAngle: number; rotation: number };

const BASE_WIDTH_PX = 520;
const CORNER = 'absolute h-3 w-3 rounded-sm border border-black bg-white';
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export default function Canvas({ baseImage, baseAlt, layers, selectedId, zoom, onSelect, onLiveChange, onSettle, onSelectedSize }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const lastSize = useRef('');
  const [canvasW, setCanvasW] = useState(0);

  // Font sizes depend on the canvas width, so track it.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setCanvasW(el.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Report the selected layer's unrotated box (as canvas fractions) for the align controls.
  useEffect(() => {
    const el = boxRef.current;
    if (!selectedId || !el) {
      if (lastSize.current !== '') {
        lastSize.current = '';
        onSelectedSize(null);
      }
      return;
    }
    const content = el.querySelector<HTMLElement>(`[data-layer-id="${selectedId}"] [data-layer-content]`);
    if (!content || !el.offsetWidth || !el.offsetHeight) return;
    const w = content.offsetWidth / el.offsetWidth;
    const h = content.offsetHeight / el.offsetHeight;
    const key = `${w.toFixed(4)}:${h.toFixed(4)}`;
    if (key !== lastSize.current) {
      lastSize.current = key;
      onSelectedSize({ w, h });
    }
  });

  const begin = (e: React.PointerEvent, layer: Layer, kind: Drag['kind']) => {
    e.stopPropagation();
    const box = boxRef.current;
    if (!box) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(layer.id);
    const r = box.getBoundingClientRect();
    const cx = r.left + layer.x * r.width;
    const cy = r.top + layer.y * r.height;
    if (kind === 'move') {
      drag.current = { kind, id: layer.id, startNx: (e.clientX - r.left) / r.width, startNy: (e.clientY - r.top) / r.height, x: layer.x, y: layer.y };
    } else if (kind === 'scale') {
      drag.current = { kind, id: layer.id, cx, cy, startDist: Math.max(1, Math.hypot(e.clientX - cx, e.clientY - cy)), scale: layer.scale };
    } else {
      drag.current = { kind, id: layer.id, cx, cy, startAngle: toDeg(Math.atan2(e.clientY - cy, e.clientX - cx)), rotation: layer.rotation };
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box) return;
    if (d.kind === 'move') {
      const r = box.getBoundingClientRect();
      onLiveChange(d.id, {
        x: d.x + ((e.clientX - r.left) / r.width - d.startNx),
        y: d.y + ((e.clientY - r.top) / r.height - d.startNy),
      });
    } else if (d.kind === 'scale') {
      onLiveChange(d.id, { scale: (d.scale * Math.hypot(e.clientX - d.cx, e.clientY - d.cy)) / d.startDist });
    } else {
      onLiveChange(d.id, { rotation: d.rotation + (toDeg(Math.atan2(e.clientY - d.cy, e.clientX - d.cx)) - d.startAngle) });
    }
  };

  const end = () => {
    if (drag.current) {
      drag.current = null;
      onSettle();
    }
  };

  return (
    <div
      ref={boxRef}
      className="relative mx-auto select-none"
      style={{ width: `${Math.round(BASE_WIDTH_PX * zoom)}px`, maxWidth: zoom <= 1 ? '100%' : 'none', touchAction: 'none' }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
      onPointerMove={onMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {baseImage ? (
        <img src={baseImage} alt={baseAlt} draggable={false} className="pointer-events-none block h-auto w-full select-none" />
      ) : (
        <div className="aspect-square w-full bg-[#F5F5F5]" />
      )}

      {layers
        .filter((l) => l.visible)
        .map((layer) => {
          const isSelected = layer.id === selectedId;
          return (
            <div
              key={layer.id}
              data-layer-id={layer.id}
              onPointerDown={(e) => begin(e, layer, 'move')}
              className={`absolute cursor-move ${isSelected ? 'outline-dashed outline-1 outline-black' : ''}`}
              style={{
                left: `${layer.x * 100}%`,
                top: `${layer.y * 100}%`,
                width: layer.type === 'image' ? `${layer.scale * 100}%` : undefined,
                transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                touchAction: 'none',
              }}
            >
              <div
                data-layer-content
                style={{
                  transform: `scale(${layer.flipX ? -1 : 1}, ${layer.flipY ? -1 : 1})`,
                  ...(layer.type === 'text'
                    ? {
                        fontSize: `${layer.scale * TEXT_FONT_FRACTION * canvasW}px`,
                        fontFamily: layer.fontFamily,
                        color: layer.color,
                        whiteSpace: 'nowrap' as const,
                        lineHeight: 1.1,
                      }
                    : {}),
                }}
              >
                {layer.type === 'image' ? (
                  <img src={layer.src} alt={layer.name} draggable={false} className="pointer-events-none block h-auto w-full select-none" />
                ) : (
                  layer.text
                )}
              </div>

              {isSelected && (
                <>
                  <span aria-hidden="true" className={`${CORNER} -left-1.5 -top-1.5 cursor-nwse-resize`} onPointerDown={(e) => begin(e, layer, 'scale')} />
                  <span aria-hidden="true" className={`${CORNER} -right-1.5 -top-1.5 cursor-nesw-resize`} onPointerDown={(e) => begin(e, layer, 'scale')} />
                  <span aria-hidden="true" className={`${CORNER} -bottom-1.5 -left-1.5 cursor-nesw-resize`} onPointerDown={(e) => begin(e, layer, 'scale')} />
                  <span aria-hidden="true" className={`${CORNER} -bottom-1.5 -right-1.5 cursor-nwse-resize`} onPointerDown={(e) => begin(e, layer, 'scale')} />
                  <span aria-hidden="true" className="absolute -top-6 left-1/2 h-5 w-px -translate-x-1/2 bg-black" />
                  <span
                    aria-hidden="true"
                    className="absolute -top-8 left-1/2 h-3.5 w-3.5 -translate-x-1/2 cursor-grab rounded-full border border-black bg-white"
                    onPointerDown={(e) => begin(e, layer, 'rotate')}
                  />
                </>
              )}
            </div>
          );
        })}
    </div>
  );
}
```

- [ ] **Step 2: Write `StudioToolbar.tsx`**

```tsx
'use client';

import { Maximize2, Minimize2, Redo2, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import type { StudioView } from '../../domain/views';

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  views: StudioView[];
  activeView: string;
  onView: (id: string) => void;
  zoom: number;
  onZoom: (next: number) => void;
  fullscreen: boolean;
  onFullscreen: () => void;
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const STEP = 0.25;
const GROUP = 'flex items-center gap-1 rounded-lg border border-[#EEEEEE] bg-white p-1';
const ICON_BTN = 'flex h-8 w-8 items-center justify-center rounded-md text-black hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:text-[#CDCDCD] disabled:hover:bg-transparent';

export default function StudioToolbar({ canUndo, canRedo, onUndo, onRedo, views, activeView, onView, zoom, onZoom, fullscreen, onFullscreen }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className={GROUP}>
        <button type="button" aria-label="Undo" title="Undo" disabled={!canUndo} onClick={onUndo} className={ICON_BTN}>
          <Undo2 className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Redo" title="Redo" disabled={!canRedo} onClick={onRedo} className={ICON_BTN}>
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      <div className={GROUP} role="tablist" aria-label="Views">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={v.id === activeView}
            onClick={() => onView(v.id)}
            className={`rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
              v.id === activeView ? 'bg-black text-white' : 'text-[#717171] hover:text-black'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className={GROUP}>
        <button type="button" aria-label="Zoom out" title="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => onZoom(Math.max(MIN_ZOOM, zoom - STEP))} className={ICON_BTN}>
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="w-10 text-center text-[11px] font-semibold text-black">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Zoom in" title="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => onZoom(Math.min(MAX_ZOOM, zoom + STEP))} className={ICON_BTN}>
          <ZoomIn className="h-4 w-4" />
        </button>
        <button type="button" aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={onFullscreen} className={ICON_BTN}>
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/customTee/presentation/studio/Canvas.tsx src/features/customTee/presentation/studio/StudioToolbar.tsx
git commit -m "feat(custom-tee): studio canvas with move/scale/rotate and toolbar"
```

---

### Task 6: Left panels (tool rail, design, images, text, layers list)

**Files:**
- Create under `src/features/customTee/presentation/studio/`: `ToolRail.tsx`, `DesignPanel.tsx`, `ImagesPanel.tsx`, `TextPanel.tsx`, `LayersList.tsx`

**Interfaces:**
- Consumes: `Asset` from `../../application/useStudioState`; `Layer`, `TextLayer`, `LayerPatch`, `FONT_OPTIONS`, `MAX_TEXT_LENGTH`, `DEFAULT_TEXT_COLOR` from `../../domain/layers`; the existing `Select` from `../Select` (`{ id, value, options: string[], placeholder, onChange(v: string) }`).
- Produces:
  - `ToolTab = 'design' | 'text' | 'images' | 'layers'`; `ToolRail({ active: ToolTab; onChange(t: ToolTab): void })`.
  - `DesignPanel({ onFiles(files: FileList | null): void; busy: boolean; error: string | null })`.
  - `ImagesPanel({ assets: Asset[]; onAdd(a: Asset): void })`.
  - `TextPanel({ selected: TextLayer | null; onAdd(text: string, fontFamily: string, color: string): void; onLiveChange(id: string, p: LayerPatch): void; onSettle(): void })`.
  - `LayersList({ layers: Layer[]; selectedId: string | null; onSelect(id: string): void; onToggle(id: string): void; onRemove(id: string): void; onMove(id: string, dir: 'up'|'down'): void; onReorder(id: string, toIndex: number): void })` — shows layers top-first.

- [ ] **Step 1: `ToolRail.tsx`**

```tsx
'use client';

import { Brush, Image as ImageIcon, Layers, Type } from 'lucide-react';

export type ToolTab = 'design' | 'text' | 'images' | 'layers';

const TABS = [
  { id: 'design', label: 'Design', icon: Brush },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'layers', label: 'Layers', icon: Layers },
] as const;

export default function ToolRail({ active, onChange }: { active: ToolTab; onChange: (t: ToolTab) => void }) {
  return (
    <nav aria-label="Studio tools" className="flex gap-1 border-b border-[#EEEEEE] p-2 lg:flex-col lg:border-b-0 lg:border-r">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={active === id}
          onClick={() => onChange(id)}
          className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors lg:flex-none ${
            active === id ? 'bg-black text-white' : 'text-[#717171] hover:bg-[#F5F5F5] hover:text-black'
          }`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: `DesignPanel.tsx`**

```tsx
'use client';

import { Upload } from 'lucide-react';

type Props = { onFiles: (files: FileList | null) => void; busy: boolean; error: string | null };

export default function DesignPanel({ onFiles, busy, error }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-black">Add Design</h2>

      <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#EEEEEE] p-1">
        <button type="button" aria-pressed="true" className="rounded-md bg-black px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white">
          Upload
        </button>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="cursor-not-allowed rounded-md px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#CDCDCD]"
        >
          Free Gallery
        </button>
      </div>

      <label
        htmlFor="artwork-file"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#CDCDCD] px-4 py-10 text-center text-xs text-[#717171] hover:border-black"
      >
        <Upload className="h-6 w-6 text-black" />
        <span>Drag &amp; drop your image here</span>
        <span>or click to upload</span>
        <span className="text-[10px]">Supports JPG, PNG, WebP (Max 10MB)</span>
      </label>
      <input
        id="artwork-file"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {busy && <p className="text-xs text-[#717171]">Processing image…</p>}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `ImagesPanel.tsx`**

```tsx
'use client';

import type { Asset } from '../../application/useStudioState';

type Props = { assets: Asset[]; onAdd: (a: Asset) => void };

export default function ImagesPanel({ assets, onAdd }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-black">Your Images</h2>
      {assets.length === 0 ? (
        <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">Images you upload appear here. Click one to add it again.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {assets.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onAdd(a)}
              className="rounded-lg border border-[#EEEEEE] p-2 text-left hover:border-black"
              title="Add to design"
            >
              <span className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-[#F5F5F5]">
                <img src={a.src} alt={a.name} className="max-h-full max-w-full object-contain" />
              </span>
              <span className="mt-2 block truncate text-[11px] text-[#717171]">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `TextPanel.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { DEFAULT_TEXT_COLOR, FONT_OPTIONS, MAX_TEXT_LENGTH, type LayerPatch, type TextLayer } from '../../domain/layers';
import Select from '../Select';

type Props = {
  selected: TextLayer | null;
  onAdd: (text: string, fontFamily: string, color: string) => void;
  onLiveChange: (id: string, p: LayerPatch) => void;
  onSettle: () => void;
};

const LABEL = 'mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#717171]';
const INPUT = 'w-full rounded-lg border border-[#EEEEEE] bg-white px-4 py-3 text-sm text-black focus:border-black focus:outline-none';
const BUTTON = 'w-full rounded-lg bg-black px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#333333] disabled:opacity-40';

const labelFor = (family: string) => FONT_OPTIONS.find((f) => f.family === family)?.label ?? FONT_OPTIONS[0].label;
const familyFor = (label: string) => FONT_OPTIONS.find((f) => f.label === label)?.family ?? FONT_OPTIONS[0].family;
const fontLabels = FONT_OPTIONS.map((f) => f.label);

// Edits an existing text layer. Keyed by layer id so its draft resets when the selection changes.
function TextEditor({ layer, onLiveChange, onSettle }: { layer: TextLayer; onLiveChange: Props['onLiveChange']; onSettle: () => void }) {
  const [draft, setDraft] = useState(layer.text);
  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="text-edit" className={LABEL}>Text</label>
        <input
          id="text-edit"
          className={INPUT}
          maxLength={MAX_TEXT_LENGTH}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value.trim()) onLiveChange(layer.id, { text: e.target.value, name: e.target.value.slice(0, 24) });
          }}
          onBlur={() => {
            if (!draft.trim()) setDraft(layer.text); // a text layer can't be empty
            onSettle();
          }}
        />
      </div>
      <div>
        <label htmlFor="text-font" className={LABEL}>Font</label>
        <Select
          id="text-font"
          value={labelFor(layer.fontFamily)}
          options={fontLabels}
          placeholder="Select a font"
          onChange={(label) => {
            onLiveChange(layer.id, { fontFamily: familyFor(label) });
            onSettle();
          }}
        />
      </div>
      <div>
        <label htmlFor="text-color" className={LABEL}>Color</label>
        <input
          id="text-color"
          type="color"
          value={layer.color}
          onChange={(e) => onLiveChange(layer.id, { color: e.target.value })}
          onBlur={onSettle}
          className="h-11 w-full cursor-pointer rounded-lg border border-[#EEEEEE] bg-white p-1"
        />
      </div>
    </div>
  );
}

export default function TextPanel({ selected, onAdd, onLiveChange, onSettle }: Props) {
  const [text, setText] = useState('');
  const [fontLabel, setFontLabel] = useState<string>(FONT_OPTIONS[0].label);
  const [color, setColor] = useState(DEFAULT_TEXT_COLOR);

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-black">Text</h2>

      {selected && <TextEditor key={selected.id} layer={selected} onLiveChange={onLiveChange} onSettle={onSettle} />}

      <div className={selected ? 'space-y-5 border-t border-[#EEEEEE] pt-5' : 'space-y-5'}>
        {selected && <p className="text-[10px] font-bold uppercase tracking-wider text-[#717171]">Add another text</p>}
        <div>
          <label htmlFor="text-new" className={LABEL}>Your text</label>
          <input id="text-new" className={INPUT} maxLength={MAX_TEXT_LENGTH} value={text} placeholder="Type something…" onChange={(e) => setText(e.target.value)} />
        </div>
        <div>
          <label htmlFor="text-new-font" className={LABEL}>Font</label>
          <Select id="text-new-font" value={fontLabel} options={fontLabels} placeholder="Select a font" onChange={setFontLabel} />
        </div>
        <div>
          <label htmlFor="text-new-color" className={LABEL}>Color</label>
          <input
            id="text-new-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-11 w-full cursor-pointer rounded-lg border border-[#EEEEEE] bg-white p-1"
          />
        </div>
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => {
            onAdd(text.trim(), familyFor(fontLabel), color);
            setText('');
          }}
          className={BUTTON}
        >
          Add text
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `LayersList.tsx`**

```tsx
'use client';

import { useRef } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Trash2, Type } from 'lucide-react';
import type { Layer } from '../../domain/layers';

type Props = {
  layers: Layer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onReorder: (id: string, toIndex: number) => void;
};

const ICON_BTN = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#717171] hover:bg-[#F5F5F5] hover:text-black disabled:cursor-not-allowed disabled:opacity-30';

// Shows the stack top-first (last array item = top layer).
export default function LayersList({ layers, selectedId, onSelect, onToggle, onRemove, onMove, onReorder }: Props) {
  const dragId = useRef<string | null>(null);
  const topFirst = layers.slice().reverse();

  if (layers.length === 0) {
    return <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">No layers yet. Upload an image or add text to start.</p>;
  }

  return (
    <ul className="space-y-1.5" aria-label="Design layers">
      {topFirst.map((layer, i) => {
        const arrayIndex = layers.length - 1 - i;
        const isSelected = layer.id === selectedId;
        return (
          <li
            key={layer.id}
            draggable
            onDragStart={() => {
              dragId.current = layer.id;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId.current && dragId.current !== layer.id) onReorder(dragId.current, arrayIndex);
              dragId.current = null;
            }}
            className={`flex items-center gap-1 rounded-lg border px-1.5 py-1.5 ${isSelected ? 'border-black bg-[#FAF9F6]' : 'border-[#EEEEEE] bg-white'} ${layer.visible ? '' : 'opacity-60'}`}
          >
            <span className="cursor-grab text-[#CDCDCD]" aria-hidden="true">
              <GripVertical className="h-4 w-4" />
            </span>
            <button type="button" onClick={() => onSelect(layer.id)} aria-pressed={isSelected} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#F5F5F5]">
                {layer.type === 'image' ? (
                  <img src={layer.src} alt="" className="h-full w-full object-contain" />
                ) : (
                  <Type className="h-4 w-4 text-[#717171]" />
                )}
              </span>
              <span className="truncate text-xs text-black">{layer.name}</span>
            </button>
            {isSelected && (
              <>
                <button type="button" aria-label="Move layer up" disabled={arrayIndex === layers.length - 1} onClick={() => onMove(layer.id, 'up')} className={ICON_BTN}>
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Move layer down" disabled={arrayIndex === 0} onClick={() => onMove(layer.id, 'down')} className={ICON_BTN}>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </>
            )}
            <button type="button" aria-label={layer.visible ? 'Hide layer' : 'Show layer'} onClick={() => onToggle(layer.id)} className={ICON_BTN}>
              {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button type="button" aria-label="Delete layer" onClick={() => onRemove(layer.id)} className={ICON_BTN}>
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/customTee/presentation/studio/ToolRail.tsx src/features/customTee/presentation/studio/DesignPanel.tsx src/features/customTee/presentation/studio/ImagesPanel.tsx src/features/customTee/presentation/studio/TextPanel.tsx src/features/customTee/presentation/studio/LayersList.tsx
git commit -m "feat(custom-tee): studio tool rail, design/images/text panels and layers list"
```

---

### Task 7: Right panels (product, position and scale)

**Files:**
- Create: `src/features/customTee/presentation/studio/ProductPanel.tsx`, `PositionScalePanel.tsx`

**Interfaces:**
- Consumes: `ParentCardData` from `../../domain/cards`; `Layer`, `AlignEdge`, `MIN_SCALE`, `MAX_SCALE`, `scaleToPercent`, `percentToScale` from `../../domain/layers`.
- Produces:
  - `ProductPanel({ card: ParentCardData; image?: string; sizes: string[]; size: string; colorName?: string; onColor(name: string): void; onSize(size: string): void })`.
  - `PositionScalePanel({ layer: Layer | null; size: { w: number; h: number } | null; onAlign(edge: AlignEdge): void; onFlip(axis: 'x' | 'y'): void; onScaleLive(scale: number): void; onSettle(): void })` — all controls disabled when `layer` is null; align disabled when `size` is null.

- [ ] **Step 1: `ProductPanel.tsx`**

```tsx
'use client';

import type { ParentCardData } from '../../domain/cards';

type Props = {
  card: ParentCardData;
  image?: string;
  sizes: string[];
  size: string;
  colorName?: string;
  onColor: (name: string) => void;
  onSize: (size: string) => void;
};

const LABEL = 'mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#717171]';

export default function ProductPanel({ card, image, sizes, size, colorName, onColor, onSize }: Props) {
  const { parent, code, colors } = card;
  return (
    <div className="space-y-5">
      <div className="flex gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-[#F5F5F5]">
          {image && <img src={image} alt={parent.name} className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-black">{parent.name}</h1>
          <p className="mt-1 text-xs text-[#717171]">
            {parent.category}
            {parent.subcategory ? ` / ${parent.subcategory}` : ''}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-[#717171]">SKU: {code}</p>
        </div>
      </div>

      {colors.length > 0 && (
        <div>
          <span className={LABEL}>Color{colorName ? ` · ${colorName}` : ''}</span>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c.name}
                type="button"
                aria-label={c.name}
                aria-pressed={c.name === colorName}
                onClick={() => onColor(c.name)}
                className={`h-9 w-9 rounded-lg border-2 ${c.name === colorName ? 'border-black' : 'border-[#EEEEEE] hover:border-[#717171]'}`}
                style={{ backgroundColor: c.colorCode || '#d4d4d4' }}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <span className={LABEL}>Size</span>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === size}
              onClick={() => onSize(s)}
              className={`min-w-12 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                s === size ? 'border-black bg-black text-white' : 'border-[#EEEEEE] bg-white text-black hover:border-black'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `PositionScalePanel.tsx`**

```tsx
'use client';

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  FlipHorizontal2,
  FlipVertical2,
} from 'lucide-react';
import { type AlignEdge, type Layer, MAX_SCALE, MIN_SCALE, percentToScale, scaleToPercent } from '../../domain/layers';

type Props = {
  layer: Layer | null;
  size: { w: number; h: number } | null;
  onAlign: (edge: AlignEdge) => void;
  onFlip: (axis: 'x' | 'y') => void;
  onScaleLive: (scale: number) => void;
  onSettle: () => void;
};

const ALIGN: { edge: AlignEdge; label: string; icon: typeof AlignStartVertical }[] = [
  { edge: 'left', label: 'Align left', icon: AlignStartVertical },
  { edge: 'center', label: 'Align center', icon: AlignCenterVertical },
  { edge: 'right', label: 'Align right', icon: AlignEndVertical },
  { edge: 'top', label: 'Align top', icon: AlignStartHorizontal },
  { edge: 'middle', label: 'Align middle', icon: AlignCenterHorizontal },
  { edge: 'bottom', label: 'Align bottom', icon: AlignEndHorizontal },
];

const LABEL = 'mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#717171]';
const ICON_BTN = 'flex h-9 w-9 items-center justify-center rounded-lg border border-[#EEEEEE] text-black hover:border-black disabled:cursor-not-allowed disabled:text-[#CDCDCD] disabled:hover:border-[#EEEEEE]';
const MIN_PERCENT = scaleToPercent(MIN_SCALE);
const MAX_PERCENT = scaleToPercent(MAX_SCALE);

export default function PositionScalePanel({ layer, size, onAlign, onFlip, onScaleLive, onSettle }: Props) {
  const none = !layer;
  const percent = layer ? scaleToPercent(layer.scale) : 100;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <div>
          <span className={LABEL}>Position</span>
          <div className="flex flex-wrap gap-1.5">
            {ALIGN.map(({ edge, label, icon: Icon }) => (
              <button key={edge} type="button" aria-label={label} title={label} disabled={none || !size} onClick={() => onAlign(edge)} className={ICON_BTN}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={LABEL}>Flip</span>
          <div className="flex gap-1.5">
            <button type="button" aria-label="Flip horizontal" title="Flip horizontal" disabled={none} onClick={() => onFlip('x')} className={ICON_BTN}>
              <FlipHorizontal2 className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Flip vertical" title="Flip vertical" disabled={none} onClick={() => onFlip('y')} className={ICON_BTN}>
              <FlipVertical2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="layer-scale" className={LABEL}>Scale</label>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-[#EEEEEE] px-3 py-2">
            <input
              aria-label="Scale percent"
              type="number"
              min={MIN_PERCENT}
              max={MAX_PERCENT}
              disabled={none}
              value={percent}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n > 0) onScaleLive(percentToScale(n));
              }}
              onBlur={onSettle}
              className="w-12 bg-transparent text-sm text-black focus:outline-none disabled:text-[#CDCDCD]"
            />
            <span className="text-sm text-[#717171]">%</span>
          </div>
          <input
            id="layer-scale"
            type="range"
            min={MIN_PERCENT}
            max={MAX_PERCENT}
            disabled={none}
            value={percent}
            onChange={(e) => onScaleLive(percentToScale(Number(e.target.value)))}
            onPointerUp={onSettle}
            onKeyUp={onSettle}
            onBlur={onSettle}
            className="flex-1 accent-black"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/customTee/presentation/studio/ProductPanel.tsx src/features/customTee/presentation/studio/PositionScalePanel.tsx
git commit -m "feat(custom-tee): studio product panel and position/scale controls"
```

---

### Task 8: Editor, page, route and popup hand-off

**Files:**
- Create: `src/features/customTee/presentation/studio/StudioEditor.tsx`, `StudioPage.tsx`
- Create: `src/app/custom-tee/studio/page.tsx`
- Modify: `src/features/customTee/presentation/CustomTeeModal.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1-7; `useCustomTeeData` (`{ parents, products, loading, error, refreshParents }`); `buildParentCard` and `ParentCardData` from `../../domain/cards`; `TrustStrip` default export from `@/features/catalog/presentation/TrustStrip`; `LayersList`, panels, `Canvas`, `StudioToolbar` as defined above.
- Produces:
  - `StudioEditor({ parent: ParentProduct; card: ParentCardData; initialSize: string; initialColor?: string; initialLayers: Layer[]; refreshParents: () => Promise<ParentProduct[]> })`.
  - `StudioPage()` (default export) — resolves the hand-off (query params `tee`,`size` first, then `sessionStorage[HANDOFF_KEY]`), redirects to `/custom-tee` when invalid.

- [ ] **Step 1: Write `StudioEditor.tsx`**

```tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Save, ShoppingBag } from 'lucide-react';
import type { ParentProduct } from '@/shared/domain/types';
import type { ParentCardData } from '../../domain/cards';
import { type AlignEdge, type Layer } from '../../domain/layers';
import { DESIGN_STORAGE_KEY, type StudioDesign, serializeDesign, validateArtworkFile } from '../../domain/design';
import { HANDOFF_KEY, resolveStudioTarget } from '../../domain/studioTarget';
import { buildViews } from '../../domain/views';
import { fileToDataUrl } from '../../application/imageUpload';
import { useStudioState } from '../../application/useStudioState';
import Canvas from './Canvas';
import StudioToolbar from './StudioToolbar';
import ToolRail, { type ToolTab } from './ToolRail';
import DesignPanel from './DesignPanel';
import ImagesPanel from './ImagesPanel';
import TextPanel from './TextPanel';
import LayersList from './LayersList';
import ProductPanel from './ProductPanel';
import PositionScalePanel from './PositionScalePanel';

type Props = {
  parent: ParentProduct;
  card: ParentCardData;
  initialSize: string;
  initialColor?: string;
  initialLayers: Layer[];
  refreshParents: () => Promise<ParentProduct[]>;
};

type Status = { kind: 'ok' | 'error'; text: string } | null;

const SECTION_TITLE = 'mb-3 text-[11px] font-bold uppercase tracking-widest text-black';
const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);

export default function StudioEditor({ parent, card, initialSize, initialColor, initialLayers, refreshParents }: Props) {
  const studio = useStudioState(initialLayers);
  const [tool, setTool] = useState<ToolTab>('design');
  const [size, setSize] = useState(initialSize);
  const [colorName, setColorName] = useState<string | undefined>(initialColor ?? card.colors[0]?.name);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<{ w: number; h: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const color = card.colors.find((c) => c.name === colorName);
  const views = useMemo(() => buildViews(parent, color), [parent, color]);
  const [activeView, setActiveView] = useState('front');
  const view = views.find((v) => v.id === activeView) ?? views[0];
  const sizes = parent.sizeOrder.filter((s) => (parent.stockBySize[s] ?? 0) > 0);
  const selectedText = studio.selected?.type === 'text' ? studio.selected : null;

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        const problem = validateArtworkFile(file);
        if (problem) {
          setUploadError(problem);
          continue;
        }
        const { src, aspect } = await fileToDataUrl(file);
        studio.addImage(studio.rememberAsset({ name: file.name, src, aspect }));
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not read that image.');
    } finally {
      setUploading(false);
    }
  };

  const toggleFullscreen = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Delete removes the selected layer; Ctrl/Cmd+Z undo, +Shift redo. Ignored while typing in a field.
  const studioRef = useRef(studio);
  studioRef.current = studio;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const s = studioRef.current;
      if ((e.key === 'Delete' || e.key === 'Backspace') && s.selectedId) {
        e.preventDefault();
        s.remove(s.selectedId);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const fresh = await refreshParents();
      if (!resolveStudioTarget(fresh, { parentProductId: parent.id, size })) {
        setStatus({ kind: 'error', text: 'This tee is no longer available in that size. Please choose another size.' });
        return;
      }
      const design: StudioDesign = { parentProductId: parent.id, size, colorName, layers: studio.layers };
      try {
        sessionStorage.setItem(DESIGN_STORAGE_KEY, serializeDesign(design));
        sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ parentProductId: parent.id, size }));
      } catch {
        setStatus({ kind: 'error', text: 'Your design is too large to save in this browser session. Try smaller images.' });
        return;
      }
      setStatus({ kind: 'ok', text: 'Design saved for this session.' });
    } catch {
      setStatus({ kind: 'error', text: 'Could not check stock. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const layersList = (
    <LayersList
      layers={studio.layers}
      selectedId={studio.selectedId}
      onSelect={studio.select}
      onToggle={studio.toggle}
      onRemove={studio.remove}
      onMove={studio.move}
      onReorder={studio.reorder}
    />
  );

  return (
    <div ref={rootRef} className="bg-white">
      <div className="mx-auto grid max-w-[1500px] border-b border-[#EEEEEE] lg:grid-cols-[88px_300px_minmax(0,1fr)_360px]">
        <ToolRail active={tool} onChange={setTool} />

        <aside className="border-b border-[#EEEEEE] p-5 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          {tool === 'design' && <DesignPanel onFiles={onFiles} busy={uploading} error={uploadError} />}
          {tool === 'images' && <ImagesPanel assets={studio.assets} onAdd={studio.addImage} />}
          {tool === 'text' && (
            <TextPanel selected={selectedText} onAdd={studio.addText} onLiveChange={studio.patchLive} onSettle={studio.settleGesture} />
          )}
          {tool === 'layers' && (
            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-black">Layers</h2>
              {layersList}
            </div>
          )}
        </aside>

        <section className="flex min-w-0 flex-col gap-4 bg-[#F5F5F5] p-4 sm:p-6">
          <StudioToolbar
            canUndo={studio.canUndo}
            canRedo={studio.canRedo}
            onUndo={studio.undo}
            onRedo={studio.redo}
            views={views}
            activeView={view?.id ?? 'front'}
            onView={setActiveView}
            zoom={zoom}
            onZoom={setZoom}
            fullscreen={fullscreen}
            onFullscreen={toggleFullscreen}
          />
          <div className="overflow-auto py-4">
            <Canvas
              baseImage={view?.image}
              baseAlt={`${parent.name} ${view?.label ?? ''}`.trim()}
              layers={studio.layers}
              selectedId={studio.selectedId}
              zoom={zoom}
              onSelect={studio.select}
              onLiveChange={studio.patchLive}
              onSettle={studio.settleGesture}
              onSelectedSize={setSelectedSize}
            />
          </div>
          <div className="flex justify-center gap-3">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-label={`${v.label} view`}
                aria-pressed={v.id === view?.id}
                onClick={() => setActiveView(v.id)}
                className={`h-16 w-16 overflow-hidden rounded-lg border-2 bg-white ${v.id === view?.id ? 'border-black' : 'border-[#EEEEEE]'}`}
              >
                <img src={v.image} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>

        <aside className="space-y-6 border-t border-[#EEEEEE] p-5 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-l lg:border-t-0">
          <ProductPanel
            card={card}
            image={view?.image}
            sizes={sizes}
            size={size}
            colorName={colorName}
            onColor={setColorName}
            onSize={(s) => {
              setSize(s);
              setStatus(null);
            }}
          />
          <div>
            <h2 className={SECTION_TITLE}>Design Layers</h2>
            {layersList}
          </div>
          <PositionScalePanel
            layer={studio.selected}
            size={selectedSize}
            onAlign={(edge: AlignEdge) => studio.selectedId && selectedSize && studio.align(studio.selectedId, selectedSize, edge)}
            onFlip={(axis) => studio.selectedId && studio.flip(studio.selectedId, axis)}
            onScaleLive={(scale) => studio.selectedId && studio.patchLive(studio.selectedId, { scale })}
            onSettle={studio.settleGesture}
          />

          {status && (
            <p role={status.kind === 'error' ? 'alert' : 'status'} className={`rounded-lg px-4 py-3 text-xs ${status.kind === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>
              {status.text}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled
              title="Coming soon"
              className="flex items-center justify-center gap-2 rounded-lg bg-[#EEEEEE] px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9A9A9A]"
            >
              <ShoppingBag className="h-4 w-4" />
              Add to Cart
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#333333] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Design'}
            </button>
          </div>
          <p className="text-center text-[10px] text-[#717171]">Add to Cart and pricing are coming soon.</p>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `StudioPage.tsx`**

```tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TrustStrip from '@/features/catalog/presentation/TrustStrip';
import { useCustomTeeData } from '../../application/useCustomTeeData';
import { buildParentCard } from '../../domain/cards';
import { DESIGN_STORAGE_KEY, parseDesign } from '../../domain/design';
import { HANDOFF_KEY, type Handoff, handoffFromParams, parseHandoff, resolveStudioTarget } from '../../domain/studioTarget';
import StudioEditor from './StudioEditor';

const MESSAGE = 'px-4 py-24 text-center text-sm text-[#717171]';

export default function StudioPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { parents, products, loading, error, refreshParents } = useCustomTeeData();
  const tee = params.get('tee');
  const sizeParam = params.get('size');

  // Query params win; otherwise the popup's sessionStorage hand-off.
  const handoff = useMemo<Handoff | null>(() => {
    const fromParams = handoffFromParams(tee, sizeParam);
    if (fromParams) return fromParams;
    return typeof window === 'undefined' ? null : parseHandoff(sessionStorage.getItem(HANDOFF_KEY));
  }, [tee, sizeParam]);

  // Resolve once after load; later stock changes must not discard unsaved work.
  const resolvedFor = useRef<string | null>(null);
  const [ready, setReady] = useState<Handoff | null>(null);
  const handoffKey = handoff ? `${handoff.parentProductId}:${handoff.size}` : '';

  useEffect(() => {
    if (loading || error) return;
    if (resolvedFor.current === handoffKey) return;
    resolvedFor.current = handoffKey;
    if (handoff && resolveStudioTarget(parents, handoff)) setReady(handoff);
    else router.replace('/custom-tee');
  }, [loading, error, handoff, handoffKey, parents, router]);

  const parent = ready ? parents.find((p) => p.id === ready.parentProductId) : undefined;
  const card = useMemo(() => (parent && ready ? buildParentCard(parent, products, ready.size) : null), [parent, products, ready]);

  if (loading) return <p className={MESSAGE}>Loading studio…</p>;
  if (error) return <p role="alert" className={`${MESSAGE} text-red-600`}>{error}</p>;
  if (!ready) return <p className={MESSAGE}>Opening your tee…</p>;
  if (!parent || !card) {
    return (
      <div className={MESSAGE}>
        <p>This tee is no longer available.</p>
        <button type="button" onClick={() => router.replace('/custom-tee')} className="mt-4 rounded-lg bg-black px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-white">
          Choose another tee
        </button>
      </div>
    );
  }

  // A saved design for the same tee is restored (layers, color, size).
  const saved = parseDesign(sessionStorage.getItem(DESIGN_STORAGE_KEY));
  const restore = saved && saved.parentProductId === parent.id ? saved : null;
  const initialSize = restore && (parent.stockBySize[restore.size] ?? 0) > 0 ? restore.size : ready.size;

  return (
    <>
      <StudioEditor
        key={`${parent.id}:${ready.size}`}
        parent={parent}
        card={card}
        initialSize={initialSize}
        initialColor={restore?.colorName}
        initialLayers={restore?.layers ?? []}
        refreshParents={refreshParents}
      />
      <TrustStrip />
    </>
  );
}
```

- [ ] **Step 3: Write the route `src/app/custom-tee/studio/page.tsx`**

```tsx
'use client';

import { Suspense } from 'react';
import Navbar from '@/features/catalog/presentation/Navbar';
import StudioPage from '@/features/customTee/presentation/studio/StudioPage';

export default function StudioRoute() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-0">
        <Suspense fallback={<p className="px-4 py-24 text-center text-sm text-[#717171]">Loading studio…</p>}>
          <StudioPage />
        </Suspense>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Update `CustomTeeModal.tsx` so Continue opens the studio**

Make these changes (read the file first; it currently shows a "Tee selected" summary after Continue):
1. Import `useRouter` from `next/navigation`, and `HANDOFF_KEY` from `../domain/studioTarget`; delete the local `const HANDOFF_KEY = 'custom-tee-selection';`.
2. Remove the `handedOff` state, the `card` `useMemo`, the `buildParentCard` and `useMemo` imports if now unused, and the entire "Tee selected" summary branch (`else if (handedOff && card) { ... }`) and the `{!handedOff && ...}` condition around the `<h2>` (always render the heading).
3. In `onContinue`, on success replace `setHandedOff(current)` with:
```tsx
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ parentProductId: current.parentId, size: current.size }));
      onClose();
      router.push(`/custom-tee/studio?tee=${encodeURIComponent(current.parentId)}&size=${encodeURIComponent(current.size)}`);
```
(keep the existing `sessionStorage.setItem` line only once, before `onClose()`), and add `const router = useRouter();` at the top of the component.

- [ ] **Step 5: Typecheck and run all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/customTee/presentation/studio/StudioEditor.tsx src/features/customTee/presentation/studio/StudioPage.tsx src/app/custom-tee/studio/page.tsx src/features/customTee/presentation/CustomTeeModal.tsx
git commit -m "feat(custom-tee): design studio page and popup hand-off"
```

---

### Task 9: Browser verification

**Files:** none (verification only; fix defects in the files above).

- [ ] **Step 1:** From `/`, open the popup, pick category/subcategory/size/tee, Continue. Expected: popup closes and `/custom-tee/studio?tee=…&size=…` loads the studio with the tee image on the canvas, product card, color/size, empty layers list, and "Add to Cart" disabled.
- [ ] **Step 2:** Upload a PNG (Design tab). Expected: a layer appears centered and selected, listed in Design Layers; the Images tab lists it.
- [ ] **Step 3:** Drag it, drag a corner handle, drag the top rotate handle. Expected: it moves, scales from the center, rotates; one Undo reverts each whole gesture.
- [ ] **Step 4:** Text tab: add text, change font/color; edit the text; Expected: updates live on the canvas.
- [ ] **Step 5:** Layers: hide/show, reorder by drag and by up/down, delete; Delete key removes the selected layer; Ctrl/Cmd+Z / +Shift redo work.
- [ ] **Step 6:** Position & Scale: each align button snaps the layer to that canvas edge/center; flip x/y mirrors; the scale slider and % box resize.
- [ ] **Step 7:** Zoom in/out (50-200%) and fullscreen toggle.
- [ ] **Step 8:** Change color and size; Save Design -> "Design saved"; reload the page -> the layers/color/size are restored.
- [ ] **Step 9:** Open `/custom-tee/studio` directly with no hand-off -> redirects to `/custom-tee` and the popup opens. Upload a `.pdf` -> clear error.
- [ ] **Step 10:** Stock check: stub the stock fetch to 0 and click Save -> error message, nothing saved. Check a narrow viewport stacks panels sensibly.
- [ ] **Step 11:** Final: `npx tsc --noEmit && npx vitest run`; commit any fixes.
