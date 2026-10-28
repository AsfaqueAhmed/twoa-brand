# Figma/Canva-style Studio Controls (Phase C2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Design Studio with snapping/guides, multi-select + marquee, flat groups, on-canvas text editing with richer text styling in a selection-aware right-hand Properties panel, and pan/smooth-zoom — keeping the storefront's black-and-white look.

**Architecture:** All new behavior lives in pure, unit-tested domain modules (`layers` additions, `grouping`, `geometry`, `snapping`, `viewport`). `useStudioState` becomes multi-select aware. `Canvas` is rewritten around a pan/zoom viewport with pointer interactions. Panels move: the left Text tab only adds text; a new Properties section on the right edits the selection.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind 4, lucide-react, Vitest (node env, `src/**/*.test.ts`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-28-custom-tee-design-design.md`, section "Phase C2: Figma/Canva-style studio controls".
- Black-and-white styling only. Guides/selection use black with a white outline; 8px radius (`rounded-lg`, nested `rounded-md`); border `#EEEEEE`, muted `#717171`; black buttons `text-[11px] font-bold uppercase tracking-widest`. Dropdowns use the existing `Select` component.
- Layer coordinates: `x`,`y` = center as fractions (0..1) of canvas width/height; `scale` clamped 0.05..1.5; image width = `scale` x canvas width; text font size = `scale * TEXT_FONT_FRACTION(0.2) * canvas width`; rotation degrees in (-180,180]; array order = z-order (last = top).
- New layer fields and ranges: `opacity` 0.05..1 (default 1); `groupId?: string` (id regex `^[A-Za-z0-9_-]{1,64}$`); text `bold`, `italic` (booleans, default false), `align` `'left'|'center'|'right'` (default `'center'`), `letterSpacing` em in -0.05..0.5 (default 0); `MAX_TEXT_LENGTH = 200`, newlines allowed.
- Groups are flat: layers sharing a `groupId`, >= 2 members, contiguous in the stack; a group with < 2 members loses its `groupId` (`normalizeGroups`). Old saved designs (no new fields) must still load with defaults.
- History semantics must keep working: operations that change nothing return the SAME array/record reference (history no-op); gestures use `live` then `settle`.
- Snapping thresholds: move snap 6 screen px; rotate snap step 15 degrees within 4 degrees (Shift forces); Alt disables move snapping. Zoom range 0.25..4.
- Work stays on branch `feat/custom-tee-design`; do not push or merge to main.
- Vitest only runs `src/**/*.test.ts`; component code is verified with `npx tsc --noEmit` and the browser.

## File Structure

- Modify `src/features/customTee/domain/layers.ts` (+ test), `design.ts` (+ test) — Task 1
- Create `src/features/customTee/domain/grouping.ts` (+ test) — Task 2
- Create `src/features/customTee/domain/geometry.ts` (+ test) — Task 3
- Create `src/features/customTee/domain/snapping.ts`, `viewport.ts` (+ tests) — Task 4
- Rewrite `src/features/customTee/application/useStudioState.ts` — Task 5
- Rewrite `src/features/customTee/presentation/studio/Canvas.tsx` — Task 6
- Create `presentation/studio/TextAddPanel.tsx`, `TextInspector.tsx`, `AppearanceSection.tsx`, `ImageInspector.tsx`, `SelectionInspector.tsx`, `AlignPanel.tsx`; rewrite `LayersList.tsx`; modify `PositionScalePanel.tsx`, `StudioToolbar.tsx`; delete `TextPanel.tsx` — Task 7
- Modify `presentation/studio/StudioEditor.tsx` — Task 8

---

### Task 1: Layer fields and design parsing

**Files:**
- Modify: `src/features/customTee/domain/layers.ts`, `src/features/customTee/domain/design.ts`
- Test: `layers.test.ts`, `design.test.ts` (same folder; append to the existing files)

**Interfaces:**
- Produces from `layers.ts`: `LayerBase` gains `opacity: number` and `groupId?: string`; `TextLayer` gains `bold: boolean; italic: boolean; align: TextAlign; letterSpacing: number`; `TextAlign = 'left'|'center'|'right'`; `LayerPatch` gains `opacity`, `groupId?: string | null` (null removes the key), `bold`, `italic`, `align`, `letterSpacing`; constants `MIN_OPACITY = 0.05`, `MIN_LETTER_SPACING = -0.05`, `MAX_LETTER_SPACING = 0.5`, `MAX_TEXT_LENGTH = 200`; `TEXT_PRESETS: readonly { kind: 'heading'|'subheading'|'body'; label: string; text: string; scale: number; bold: boolean }[]`; `createTextLayer(init)` accepts optional `scale, bold, italic, align, letterSpacing` in addition to `id, text, fontFamily?, color?`.
- Produces from `design.ts`: `parseLayer` defaults the new fields (opacity 1, bold/italic false, align `'center'`, letterSpacing 0), clamps them, validates `groupId`, accepts text up to 200 chars including newlines, and `parseDesign`'s per-view list drops `groupId` from groups with fewer than 2 members.

- [ ] **Step 1: Write the failing tests.** Append to `layers.test.ts` (add the new names to its imports: `TEXT_PRESETS`, `MAX_TEXT_LENGTH`):

```ts
describe('appearance and text style fields', () => {
  it('defaults new fields', () => {
    const i = createImageLayer({ id: 'a', name: 'a', src: 'data:image/png;base64,AA', aspect: 1 });
    expect(i.opacity).toBe(1);
    expect(i.groupId).toBeUndefined();
    const t = createTextLayer({ id: 't', text: 'Hi' });
    expect(t).toMatchObject({ opacity: 1, bold: false, italic: false, align: 'center', letterSpacing: 0 });
  });
  it('createTextLayer accepts style overrides', () => {
    const t = createTextLayer({ id: 'h', text: 'Heading', scale: 0.6, bold: true, italic: true, align: 'left', letterSpacing: 0.1 });
    expect(t).toMatchObject({ scale: 0.6, bold: true, italic: true, align: 'left', letterSpacing: 0.1 });
  });
  it('exposes heading/subheading/body presets', () => {
    expect(TEXT_PRESETS.map((p) => p.kind)).toEqual(['heading', 'subheading', 'body']);
    expect(TEXT_PRESETS[0].scale).toBeGreaterThan(TEXT_PRESETS[2].scale);
  });
  it('allows long multi-line text up to 200 chars', () => {
    expect(MAX_TEXT_LENGTH).toBe(200);
  });
  it('clamps opacity and letter spacing', () => {
    const i = createImageLayer({ id: 'a', name: 'a', src: 'data:image/png;base64,AA', aspect: 1 });
    expect(clampLayer({ ...i, opacity: 0 }).opacity).toBe(0.05);
    expect(clampLayer({ ...i, opacity: 5 }).opacity).toBe(1);
    const t = createTextLayer({ id: 't', text: 'Hi' });
    expect(clampLayer({ ...t, letterSpacing: 9 }).letterSpacing).toBe(0.5);
    expect(clampLayer({ ...t, letterSpacing: -9 }).letterSpacing).toBe(-0.05);
  });
  it('patches opacity, text style and groupId (null removes it)', () => {
    const t = createTextLayer({ id: 't', text: 'Hi' });
    const out = updateLayer([t], 't', { opacity: 0.5, bold: true, align: 'right', letterSpacing: 0.2, groupId: 'g1' })[0];
    expect(out).toMatchObject({ opacity: 0.5, bold: true, align: 'right', letterSpacing: 0.2, groupId: 'g1' });
    const cleared = updateLayer([out], 't', { groupId: null })[0];
    expect('groupId' in cleared).toBe(false);
  });
  it('an unchanged patch returns the same array', () => {
    const t = createTextLayer({ id: 't', text: 'Hi' });
    const layers = [t];
    expect(updateLayer(layers, 't', { opacity: 1, bold: false })).toBe(layers);
  });
});
```
Append to `design.test.ts` (it already imports `createImageLayer`, `createTextLayer`, `parseDesign`, `serializeDesign`):
```ts
describe('new layer fields in saved designs', () => {
  const img = (id: string, extra: Record<string, unknown> = {}) => ({ ...createImageLayer({ id, name: `${id}.png`, src: 'data:image/png;base64,AAAA', aspect: 1 }), ...extra });
  const parse = (layers: unknown[]) => parseDesign(JSON.stringify({ parentProductId: 'p', size: 'M', layersByView: { 'view-0': layers } }))!.layersByView['view-0'] ?? [];

  it('defaults missing fields on older layers', () => {
    const legacy = { type: 'text', id: 't', name: 'x', text: 'Hi', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111', x: 0.5, y: 0.5, scale: 0.4, rotation: 0 };
    expect(parse([legacy])[0]).toMatchObject({ opacity: 1, bold: false, italic: false, align: 'center', letterSpacing: 0 });
  });
  it('keeps valid new fields and sanitizes bad ones', () => {
    const t = { ...createTextLayer({ id: 't', text: 'Hi' }), bold: true, italic: true, align: 'right', letterSpacing: 9, opacity: 0 };
    expect(parse([t])[0]).toMatchObject({ bold: true, italic: true, align: 'right', letterSpacing: 0.5, opacity: 0.05 });
    expect(parse([{ ...t, align: 'justify' }])[0]).toMatchObject({ align: 'center' });
  });
  it('accepts multi-line text up to 200 chars and rejects longer', () => {
    expect(parse([createTextLayer({ id: 't', text: 'a\nb' })])).toHaveLength(1);
    expect(parse([{ ...createTextLayer({ id: 't', text: 'x' }), text: 'x'.repeat(201) }])).toHaveLength(0);
  });
  it('keeps a groupId only when 2+ layers share it and it is a valid id', () => {
    const out = parse([img('a', { groupId: 'g1' }), img('b', { groupId: 'g1' }), img('c', { groupId: 'lonely' }), img('d', { groupId: 'bad id!' })]);
    expect(out.map((l) => l.groupId)).toEqual(['g1', 'g1', undefined, undefined]);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail.** `npx vitest run src/features/customTee/domain/layers.test.ts src/features/customTee/domain/design.test.ts` — expected FAIL (new behavior missing).

- [ ] **Step 3: Implement.** Read both files first, then:

`layers.ts`:
- `LayerBase`: add `opacity: number;` and `groupId?: string;`. `TextLayer`: add `bold: boolean; italic: boolean; align: TextAlign; letterSpacing: number;` and `export type TextAlign = 'left' | 'center' | 'right';`.
- `LayerPatch`: replace its definition with
```ts
export type LayerPatch = Partial<Omit<LayerBase, 'id' | 'groupId'>> & {
  groupId?: string | null; // null removes the group id
  src?: string;
  aspect?: number;
  text?: string;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: TextAlign;
  letterSpacing?: number;
};
```
- Constants: `MAX_TEXT_LENGTH = 200`, `MIN_OPACITY = 0.05`, `MIN_LETTER_SPACING = -0.05`, `MAX_LETTER_SPACING = 0.5`, and
```ts
export const TEXT_PRESETS = [
  { kind: 'heading', label: 'Add a heading', text: 'Heading', scale: 0.6, bold: true },
  { kind: 'subheading', label: 'Add a subheading', text: 'Subheading', scale: 0.35, bold: true },
  { kind: 'body', label: 'Add body text', text: 'Body text', scale: 0.2, bold: false },
] as const;
```
- `baseDefaults` gains `opacity: 1`. `clampLayer` also clamps `opacity` to `[MIN_OPACITY, 1]` and, for text layers, `letterSpacing` to `[MIN_LETTER_SPACING, MAX_LETTER_SPACING]` (keep it generic on `T extends Layer`; cast as needed).
- `createTextLayer` init type: `{ id: string; text: string; fontFamily?: string; color?: string; scale?: number; bold?: boolean; italic?: boolean; align?: TextAlign; letterSpacing?: number }`, producing `{ ...baseDefaults, type: 'text', ..., scale: init.scale ?? DEFAULT_SCALE, bold: init.bold ?? false, italic: init.italic ?? false, align: init.align ?? 'center', letterSpacing: init.letterSpacing ?? 0 }` (keep the existing `name` rule).
- `updateLayer`: handle the new patch fields — for BOTH layer types apply base fields (including `opacity`) and `groupId` (`undefined` = untouched, `null` = delete the key, string = set); for text layers also apply `bold`, `italic`, `align`, `letterSpacing` (plus the existing `text`, `fontFamily`, `color`). Keep the existing behavior that returns the SAME array when the patched layer is shallow-equal to the old one (extend the shallow-equal check to the new fields).

`design.ts`:
- Import `MIN_OPACITY`... not needed; rely on `clampLayer`. In `parseLayer` base object add `opacity: isNum(o.opacity) ? o.opacity : 1` and `...(typeof o.groupId === 'string' && LAYER_ID.test(o.groupId) ? { groupId: o.groupId } : {})`. In the text branch: remove the old length rule and use `o.text.length > MAX_TEXT_LENGTH` (now 200; newlines allowed); add `bold: o.bold === true, italic: o.italic === true, align: o.align === 'left' || o.align === 'right' ? o.align : 'center', letterSpacing: isNum(o.letterSpacing) ? o.letterSpacing : 0`.
- After `parseLayerList` builds `out`, strip `groupId` from groups with fewer than 2 members (implement locally or import `normalizeGroups` from `./grouping` ONLY if Task 2 is already merged; otherwise inline the same counting logic).

- [ ] **Step 4: Run tests and typecheck.** `npx vitest run src/features/customTee/domain && npx tsc --noEmit`. Expected PASS. If tsc reports errors in UI files because they construct text layers or read fields, fix them minimally (e.g. add defaults) — but UI behavior changes belong to later tasks.

- [ ] **Step 5: Commit**
```bash
git add src/features/customTee/domain/layers.ts src/features/customTee/domain/layers.test.ts src/features/customTee/domain/design.ts src/features/customTee/domain/design.test.ts
git commit -m "feat(custom-tee): layer opacity, text style fields and group ids"
```

---

### Task 2: Grouping domain

**Files:**
- Create: `src/features/customTee/domain/grouping.ts`
- Test: `src/features/customTee/domain/grouping.test.ts`

**Interfaces:**
- Consumes: `Layer` from `./layers`.
- Produces: `expandToGroups(layers, ids): string[]` (ids plus all members of their groups, in stack order), `toggleId(selected: string[], id: string): string[]`, `normalizeGroups(layers): Layer[]`, `removeLayers(layers, ids): Layer[]`, `groupLayers(layers, ids, groupId): Layer[]`, `ungroupLayers(layers, ids): Layer[]`, `stackUnits(layers): string[][]`, `selectionUnits(layers, ids): string[][]`, `isSingleUnit(layers, ids): boolean`, `moveUnit(layers, id, dir: 'up'|'down'): Layer[]`, `reorderUnit(layers, id, toUnitIndex): Layer[]`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createImageLayer, type Layer } from './layers';
import {
  expandToGroups,
  toggleId,
  normalizeGroups,
  removeLayers,
  groupLayers,
  ungroupLayers,
  stackUnits,
  selectionUnits,
  isSingleUnit,
  moveUnit,
  reorderUnit,
} from './grouping';

const L = (id: string, groupId?: string): Layer => ({
  ...createImageLayer({ id, name: id, src: 'data:image/png;base64,AA', aspect: 1 }),
  ...(groupId ? { groupId } : {}),
});
const ids = (ls: Layer[]) => ls.map((l) => l.id);

describe('expandToGroups / toggleId', () => {
  const layers = [L('a'), L('b', 'g'), L('c'), L('d', 'g')];
  it('adds every member of a touched group, in stack order', () => {
    expect(expandToGroups(layers, ['b'])).toEqual(['b', 'd']);
    expect(expandToGroups(layers, ['c', 'd'])).toEqual(['b', 'c', 'd']);
    expect(expandToGroups(layers, ['a'])).toEqual(['a']);
  });
  it('toggles an id in a selection', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('normalizeGroups / removeLayers', () => {
  it('drops group ids that have fewer than two members', () => {
    const out = normalizeGroups([L('a', 'g'), L('b'), L('c', 'h'), L('d', 'h')]);
    expect(out[0].groupId).toBeUndefined();
    expect(out[2].groupId).toBe('h');
  });
  it('returns the same array when nothing needs fixing', () => {
    const layers = [L('a', 'g'), L('b', 'g')];
    expect(normalizeGroups(layers)).toBe(layers);
  });
  it('removing a member dissolves a two-member group', () => {
    const out = removeLayers([L('a', 'g'), L('b', 'g'), L('c')], ['a']);
    expect(ids(out)).toEqual(['b', 'c']);
    expect(out[0].groupId).toBeUndefined();
  });
  it('returns the same array when no id matches', () => {
    const layers = [L('a')];
    expect(removeLayers(layers, ['zzz'])).toBe(layers);
  });
});

describe('groupLayers / ungroupLayers', () => {
  it('groups the selection, contiguous at the topmost member', () => {
    const out = groupLayers([L('a'), L('b'), L('c'), L('d')], ['a', 'c'], 'g1');
    expect(ids(out)).toEqual(['b', 'a', 'c', 'd']);
    expect(out.filter((l) => l.groupId === 'g1').map((l) => l.id)).toEqual(['a', 'c']);
  });
  it('needs at least two layers', () => {
    const layers = [L('a'), L('b')];
    expect(groupLayers(layers, ['a'], 'g1')).toBe(layers);
  });
  it('merges existing groups touched by the selection', () => {
    const out = groupLayers([L('a', 'g'), L('b', 'g'), L('c')], ['b', 'c'], 'g2');
    expect(out.every((l) => l.groupId === 'g2')).toBe(true);
  });
  it('ungroups the groups touched by the selection', () => {
    const out = ungroupLayers([L('a', 'g'), L('b', 'g'), L('c', 'h'), L('d', 'h')], ['a']);
    expect(out[0].groupId).toBeUndefined();
    expect(out[1].groupId).toBeUndefined();
    expect(out[2].groupId).toBe('h');
  });
  it('ungroup is a no-op (same array) when nothing is grouped', () => {
    const layers = [L('a'), L('b')];
    expect(ungroupLayers(layers, ['a', 'b'])).toBe(layers);
  });
});

describe('units', () => {
  const layers = [L('a'), L('b', 'g'), L('c', 'g'), L('d')];
  it('partitions the stack into units', () => {
    expect(stackUnits(layers)).toEqual([['a'], ['b', 'c'], ['d']]);
  });
  it('lists the units a selection touches', () => {
    expect(selectionUnits(layers, ['c', 'd'])).toEqual([['b', 'c'], ['d']]);
  });
  it('isSingleUnit is true for one lone layer or one full group', () => {
    expect(isSingleUnit(layers, ['a'])).toBe(true);
    expect(isSingleUnit(layers, ['b', 'c'])).toBe(true);
    expect(isSingleUnit(layers, ['b'])).toBe(false); // part of a group
    expect(isSingleUnit(layers, ['a', 'd'])).toBe(false);
    expect(isSingleUnit(layers, [])).toBe(false);
  });
  it('moves a whole unit up/down, no-op at the edges', () => {
    expect(ids(moveUnit(layers, 'b', 'up'))).toEqual(['a', 'd', 'b', 'c']);
    expect(ids(moveUnit(layers, 'd', 'down'))).toEqual(['a', 'd', 'b', 'c']);
    expect(moveUnit(layers, 'd', 'up')).toBe(layers);
    expect(moveUnit(layers, 'a', 'down')).toBe(layers);
  });
  it('reorders a unit to a unit index', () => {
    expect(ids(reorderUnit(layers, 'a', 2))).toEqual(['b', 'c', 'd', 'a']);
    expect(ids(reorderUnit(layers, 'd', 0))).toEqual(['d', 'a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run test, verify it fails.** `npx vitest run src/features/customTee/domain/grouping.test.ts` — FAIL (module missing).

- [ ] **Step 3: Implement `grouping.ts`**

```ts
import type { Layer } from './layers';

const withoutGroup = (l: Layer): Layer => {
  const { groupId: _groupId, ...rest } = l;
  return rest as Layer;
};

// `ids` plus every member of the groups they belong to, in stack order.
export function expandToGroups(layers: Layer[], ids: string[]): string[] {
  const wanted = new Set(ids);
  const groups = new Set<string>();
  for (const l of layers) if (wanted.has(l.id) && l.groupId) groups.add(l.groupId);
  return layers.filter((l) => wanted.has(l.id) || (l.groupId !== undefined && groups.has(l.groupId))).map((l) => l.id);
}

export const toggleId = (selected: string[], id: string): string[] =>
  selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];

// A group needs at least two members; lone group ids are dropped.
export function normalizeGroups(layers: Layer[]): Layer[] {
  const counts = new Map<string, number>();
  for (const l of layers) if (l.groupId) counts.set(l.groupId, (counts.get(l.groupId) ?? 0) + 1);
  if (![...counts.values()].some((n) => n < 2)) return layers;
  return layers.map((l) => (l.groupId && (counts.get(l.groupId) ?? 0) < 2 ? withoutGroup(l) : l));
}

export function removeLayers(layers: Layer[], ids: string[]): Layer[] {
  const gone = new Set(ids);
  if (!layers.some((l) => gone.has(l.id))) return layers;
  return normalizeGroups(layers.filter((l) => !gone.has(l.id)));
}

// Makes the selection (expanded to whole groups) one group, contiguous at the position of the topmost member.
export function groupLayers(layers: Layer[], ids: string[], groupId: string): Layer[] {
  const members = new Set(expandToGroups(layers, ids));
  if (members.size < 2) return layers;
  let topIndex = -1;
  layers.forEach((l, i) => {
    if (members.has(l.id)) topIndex = i;
  });
  const insertAt = layers.slice(0, topIndex).filter((l) => !members.has(l.id)).length;
  const grouped = layers.filter((l) => members.has(l.id)).map((l) => ({ ...l, groupId }) as Layer);
  const rest = layers.filter((l) => !members.has(l.id));
  return normalizeGroups([...rest.slice(0, insertAt), ...grouped, ...rest.slice(insertAt)]);
}

export function ungroupLayers(layers: Layer[], ids: string[]): Layer[] {
  const members = new Set(expandToGroups(layers, ids));
  if (!layers.some((l) => members.has(l.id) && l.groupId)) return layers;
  return layers.map((l) => (members.has(l.id) && l.groupId ? withoutGroup(l) : l));
}

// A "unit" is a group (its members) or a lone layer; returned in stack order.
export function stackUnits(layers: Layer[]): string[][] {
  const units: string[][] = [];
  const byGroup = new Map<string, string[]>();
  for (const l of layers) {
    if (l.groupId) {
      const existing = byGroup.get(l.groupId);
      if (existing) {
        existing.push(l.id);
        continue;
      }
      const unit = [l.id];
      byGroup.set(l.groupId, unit);
      units.push(unit);
    } else {
      units.push([l.id]);
    }
  }
  return units;
}

export function selectionUnits(layers: Layer[], ids: string[]): string[][] {
  const selected = new Set(ids);
  return stackUnits(layers).filter((unit) => unit.some((id) => selected.has(id)));
}

// True when the selection is exactly one lone layer or one complete group.
export function isSingleUnit(layers: Layer[], ids: string[]): boolean {
  const units = selectionUnits(layers, ids);
  return units.length === 1 && units[0].every((id) => ids.includes(id));
}

const flatten = (units: string[][], layers: Layer[]): Layer[] => {
  const byId = new Map(layers.map((l) => [l.id, l]));
  return units.flat().map((id) => byId.get(id)!);
};

// 'up' moves toward the top of the stack (later in the array); moves a whole group as a block.
export function moveUnit(layers: Layer[], id: string, direction: 'up' | 'down'): Layer[] {
  const units = stackUnits(layers);
  const i = units.findIndex((u) => u.includes(id));
  const j = direction === 'up' ? i + 1 : i - 1;
  if (i < 0 || j < 0 || j >= units.length) return layers;
  const next = units.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return flatten(next, layers);
}

export function reorderUnit(layers: Layer[], id: string, toUnitIndex: number): Layer[] {
  const units = stackUnits(layers);
  const i = units.findIndex((u) => u.includes(id));
  if (i < 0) return layers;
  const next = units.slice();
  const [moved] = next.splice(i, 1);
  next.splice(Math.min(Math.max(toUnitIndex, 0), next.length), 0, moved);
  return flatten(next, layers);
}
```

- [ ] **Step 4: Run tests.** `npx vitest run src/features/customTee/domain/grouping.test.ts` — PASS.

- [ ] **Step 5: Commit**
```bash
git add src/features/customTee/domain/grouping.ts src/features/customTee/domain/grouping.test.ts
git commit -m "feat(custom-tee): flat layer groups, selection units and unit reordering"
```

---

### Task 3: Geometry domain (bounds, group transforms, align, distribute)

**Files:**
- Create: `src/features/customTee/domain/geometry.ts`
- Test: `src/features/customTee/domain/geometry.test.ts`

**Interfaces:**
- Consumes: `Layer`, `AlignEdge`, `updateLayer` from `./layers`; `selectionUnits` from `./grouping`.
- Produces: types `Size = { w: number; h: number }` (a layer's unrotated box as fractions of canvas width/height), `CanvasPx = { w: number; h: number }`, `Box = { left; top; right; bottom }` (normalized); functions `layerBox(layer, size, canvas): Box` (rotated bounding box), `unionBox(boxes: Box[]): Box | null`, `boxCenter(box): {x,y}`, `boxesIntersect(a, b): boolean`, `moveLayersBy(layers, ids, dx, dy): Layer[]`, `scaleLayersAround(layers, ids, factor, anchor, canvas): Layer[]`, `rotateLayersAround(layers, ids, deg, anchor, canvas): Layer[]`, `alignLayers(layers, ids, sizes: Record<string, Size>, edge: AlignEdge, canvas): Layer[]`, `distributeLayers(layers, ids, sizes, axis: 'horizontal'|'vertical', canvas): Layer[]`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createImageLayer, type Layer } from './layers';
import {
  layerBox,
  unionBox,
  boxCenter,
  boxesIntersect,
  moveLayersBy,
  scaleLayersAround,
  rotateLayersAround,
  alignLayers,
  distributeLayers,
} from './geometry';

const canvas = { w: 100, h: 100 };
const L = (id: string, x: number, y = 0.5, extra: Partial<Layer> = {}): Layer =>
  ({ ...createImageLayer({ id, name: id, src: 'data:image/png;base64,AA', aspect: 1 }), x, y, ...extra }) as Layer;
const byId = (ls: Layer[], id: string) => ls.find((l) => l.id === id)!;
const size = { w: 0.2, h: 0.2 };

describe('boxes', () => {
  it('computes an unrotated box', () => {
    const b = layerBox(L('a', 0.5, 0.5), { w: 0.4, h: 0.2 }, canvas);
    expect(b.left).toBeCloseTo(0.3);
    expect(b.right).toBeCloseTo(0.7);
    expect(b.top).toBeCloseTo(0.4);
    expect(b.bottom).toBeCloseTo(0.6);
  });
  it('uses the rotated bounding box', () => {
    const b = layerBox(L('a', 0.5, 0.5, { rotation: 90 }), { w: 0.4, h: 0.2 }, canvas);
    expect(b.left).toBeCloseTo(0.4);
    expect(b.right).toBeCloseTo(0.6);
    expect(b.top).toBeCloseTo(0.3);
    expect(b.bottom).toBeCloseTo(0.7);
  });
  it('unions, centers and intersects', () => {
    const u = unionBox([{ left: 0.1, top: 0.2, right: 0.3, bottom: 0.4 }, { left: 0.2, top: 0.1, right: 0.6, bottom: 0.5 }])!;
    expect(u).toEqual({ left: 0.1, top: 0.1, right: 0.6, bottom: 0.5 });
    expect(unionBox([])).toBeNull();
    expect(boxCenter(u).x).toBeCloseTo(0.35);
    expect(boxCenter(u).y).toBeCloseTo(0.3);
    expect(boxesIntersect({ left: 0, top: 0, right: 0.5, bottom: 0.5 }, { left: 0.4, top: 0.4, right: 1, bottom: 1 })).toBe(true);
    expect(boxesIntersect({ left: 0, top: 0, right: 0.3, bottom: 0.3 }, { left: 0.4, top: 0.4, right: 1, bottom: 1 })).toBe(false);
  });
});

describe('group transforms', () => {
  it('moves only the given layers', () => {
    const out = moveLayersBy([L('a', 0.2), L('b', 0.5)], ['a'], 0.1, 0.05);
    expect(byId(out, 'a').x).toBeCloseTo(0.3);
    expect(byId(out, 'a').y).toBeCloseTo(0.55);
    expect(byId(out, 'b').x).toBe(0.5);
  });
  it('scales positions and sizes around an anchor', () => {
    const out = scaleLayersAround([L('a', 0.6, 0.5, { scale: 0.2 })], ['a'], 2, { x: 0.5, y: 0.5 }, canvas);
    expect(byId(out, 'a').x).toBeCloseTo(0.7);
    expect(byId(out, 'a').scale).toBeCloseTo(0.4);
  });
  it('rotates positions and orientations around an anchor', () => {
    const out = rotateLayersAround([L('a', 0.6, 0.5)], ['a'], 90, { x: 0.5, y: 0.5 }, canvas);
    expect(byId(out, 'a').x).toBeCloseTo(0.5);
    expect(byId(out, 'a').y).toBeCloseTo(0.6);
    expect(byId(out, 'a').rotation).toBeCloseTo(90);
  });
});

describe('alignLayers', () => {
  it('aligns a single layer to the canvas', () => {
    const sizes = { a: size };
    expect(byId(alignLayers([L('a', 0.5)], ['a'], sizes, 'left', canvas), 'a').x).toBeCloseTo(0.1);
    expect(byId(alignLayers([L('a', 0.5)], ['a'], sizes, 'right', canvas), 'a').x).toBeCloseTo(0.9);
    expect(byId(alignLayers([L('a', 0.5, 0.2)], ['a'], sizes, 'bottom', canvas), 'a').y).toBeCloseTo(0.9);
  });
  it('aligns several layers to each other (selection bounds)', () => {
    const sizes = { a: size, b: size };
    const layers = [L('a', 0.2), L('b', 0.6)];
    expect(byId(alignLayers(layers, ['a', 'b'], sizes, 'left', canvas), 'b').x).toBeCloseTo(0.2);
    expect(byId(alignLayers(layers, ['a', 'b'], sizes, 'right', canvas), 'a').x).toBeCloseTo(0.6);
    const c = alignLayers(layers, ['a', 'b'], sizes, 'center', canvas);
    expect(byId(c, 'a').x).toBeCloseTo(0.4);
    expect(byId(c, 'b').x).toBeCloseTo(0.4);
  });
  it('moves a group as one block', () => {
    const sizes = { a: size, b: size, c: size };
    const layers = [L('a', 0.2, 0.5, { groupId: 'g' }), L('b', 0.4, 0.5, { groupId: 'g' }), L('c', 0.8)];
    const out = alignLayers(layers, ['a', 'b', 'c'], sizes, 'left', canvas);
    expect(byId(out, 'a').x).toBeCloseTo(0.2);
    expect(byId(out, 'b').x).toBeCloseTo(0.4);
    expect(byId(out, 'c').x).toBeCloseTo(0.2);
  });
  it('returns the layers unchanged when a size is missing', () => {
    const layers = [L('a', 0.2), L('b', 0.6)];
    expect(alignLayers(layers, ['a', 'b'], { a: size }, 'left', canvas)).toBe(layers);
  });
});

describe('distributeLayers', () => {
  const sizes = { a: size, b: size, c: size };
  it('spreads three layers with equal gaps, keeping the outer two fixed', () => {
    const layers = [L('a', 0.2), L('b', 0.35), L('c', 0.9)];
    const out = distributeLayers(layers, ['a', 'b', 'c'], sizes, 'horizontal', canvas);
    expect(byId(out, 'a').x).toBeCloseTo(0.2);
    expect(byId(out, 'c').x).toBeCloseTo(0.9);
    expect(byId(out, 'b').x).toBeCloseTo(0.55);
  });
  it('distributes vertically', () => {
    const layers = [L('a', 0.5, 0.2), L('b', 0.5, 0.3), L('c', 0.5, 0.9)];
    const out = distributeLayers(layers, ['a', 'b', 'c'], sizes, 'vertical', canvas);
    expect(byId(out, 'b').y).toBeCloseTo(0.55);
  });
  it('needs at least three units', () => {
    const layers = [L('a', 0.2), L('b', 0.6)];
    expect(distributeLayers(layers, ['a', 'b'], sizes, 'horizontal', canvas)).toBe(layers);
  });
});
```

- [ ] **Step 2: Run test, verify it fails.** `npx vitest run src/features/customTee/domain/geometry.test.ts` — FAIL (module missing).

- [ ] **Step 3: Implement `geometry.ts`**

```ts
import { type AlignEdge, type Layer, updateLayer } from './layers';
import { selectionUnits } from './grouping';

export type Size = { w: number; h: number };
export type CanvasPx = { w: number; h: number };
export type Box = { left: number; top: number; right: number; bottom: number };

const FULL: Box = { left: 0, top: 0, right: 1, bottom: 1 };

// Bounding box of the (rotated) layer, in canvas fractions.
export function layerBox(layer: Layer, size: Size, canvas: CanvasPx): Box {
  const rad = (layer.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const wPx = size.w * canvas.w;
  const hPx = size.h * canvas.h;
  const bw = (wPx * cos + hPx * sin) / canvas.w;
  const bh = (wPx * sin + hPx * cos) / canvas.h;
  return { left: layer.x - bw / 2, right: layer.x + bw / 2, top: layer.y - bh / 2, bottom: layer.y + bh / 2 };
}

export function unionBox(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  return boxes.reduce((u, b) => ({
    left: Math.min(u.left, b.left),
    top: Math.min(u.top, b.top),
    right: Math.max(u.right, b.right),
    bottom: Math.max(u.bottom, b.bottom),
  }));
}

export const boxCenter = (b: Box) => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 });

export const boxesIntersect = (a: Box, b: Box): boolean =>
  a.left <= b.right && b.left <= a.right && a.top <= b.bottom && b.top <= a.bottom;

export function moveLayersBy(layers: Layer[], ids: string[], dx: number, dy: number): Layer[] {
  const selected = new Set(ids);
  let out = layers;
  for (const l of layers) {
    if (selected.has(l.id)) out = updateLayer(out, l.id, { x: l.x + dx, y: l.y + dy });
  }
  return out;
}

// Scales positions (in pixel space, so the aspect ratio is respected) and sizes about `anchor`.
export function scaleLayersAround(layers: Layer[], ids: string[], factor: number, anchor: { x: number; y: number }, canvas: CanvasPx): Layer[] {
  const selected = new Set(ids);
  let out = layers;
  for (const l of layers) {
    if (!selected.has(l.id)) continue;
    out = updateLayer(out, l.id, {
      x: anchor.x + ((l.x - anchor.x) * factor),
      y: anchor.y + ((l.y - anchor.y) * factor),
      scale: l.scale * factor,
    });
  }
  void canvas; // normalized offsets scale uniformly, so the canvas size isn't needed for scaling
  return out;
}

// Rotates positions (in pixel space) and orientations about `anchor`.
export function rotateLayersAround(layers: Layer[], ids: string[], deg: number, anchor: { x: number; y: number }, canvas: CanvasPx): Layer[] {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const selected = new Set(ids);
  let out = layers;
  for (const l of layers) {
    if (!selected.has(l.id)) continue;
    const vx = (l.x - anchor.x) * canvas.w;
    const vy = (l.y - anchor.y) * canvas.h;
    out = updateLayer(out, l.id, {
      x: anchor.x + (vx * cos - vy * sin) / canvas.w,
      y: anchor.y + (vx * sin + vy * cos) / canvas.h,
      rotation: l.rotation + deg,
    });
  }
  return out;
}

type UnitBoxes = { units: string[][]; boxes: Box[] } | null;

function unitBoxes(layers: Layer[], ids: string[], sizes: Record<string, Size>, canvas: CanvasPx): UnitBoxes {
  const units = selectionUnits(layers, ids);
  const boxes: Box[] = [];
  for (const unit of units) {
    const members: Box[] = [];
    for (const id of unit) {
      const layer = layers.find((l) => l.id === id);
      const size = sizes[id];
      if (!layer || !size) return null;
      members.push(layerBox(layer, size, canvas));
    }
    boxes.push(unionBox(members)!);
  }
  return { units, boxes };
}

// One unit (a layer or a whole group) aligns to the canvas; two or more units align to the selection's bounds.
export function alignLayers(layers: Layer[], ids: string[], sizes: Record<string, Size>, edge: AlignEdge, canvas: CanvasPx): Layer[] {
  const ub = unitBoxes(layers, ids, sizes, canvas);
  if (!ub || ub.units.length === 0) return layers;
  const target = ub.units.length === 1 ? FULL : unionBox(ub.boxes)!;
  let out = layers;
  ub.units.forEach((unit, i) => {
    const b = ub.boxes[i];
    let dx = 0;
    let dy = 0;
    if (edge === 'left') dx = target.left - b.left;
    else if (edge === 'center') dx = (target.left + target.right) / 2 - (b.left + b.right) / 2;
    else if (edge === 'right') dx = target.right - b.right;
    else if (edge === 'top') dy = target.top - b.top;
    else if (edge === 'middle') dy = (target.top + target.bottom) / 2 - (b.top + b.bottom) / 2;
    else dy = target.bottom - b.bottom;
    if (dx !== 0 || dy !== 0) out = moveLayersBy(out, unit, dx, dy);
  });
  return out;
}

// Equal gaps between three or more units; the outermost two stay where they are.
export function distributeLayers(layers: Layer[], ids: string[], sizes: Record<string, Size>, axis: 'horizontal' | 'vertical', canvas: CanvasPx): Layer[] {
  const ub = unitBoxes(layers, ids, sizes, canvas);
  if (!ub || ub.units.length < 3) return layers;
  const start = (b: Box) => (axis === 'horizontal' ? b.left : b.top);
  const end = (b: Box) => (axis === 'horizontal' ? b.right : b.bottom);
  const order = ub.units.map((_, i) => i).sort((a, b) => start(ub.boxes[a]) + end(ub.boxes[a]) - (start(ub.boxes[b]) + end(ub.boxes[b])));
  const first = ub.boxes[order[0]];
  const last = ub.boxes[order[order.length - 1]];
  const total = end(last) - start(first);
  const used = order.reduce((sum, i) => sum + (end(ub.boxes[i]) - start(ub.boxes[i])), 0);
  const gap = (total - used) / (order.length - 1);
  let cursor = start(first);
  let out = layers;
  for (const i of order) {
    const b = ub.boxes[i];
    const delta = cursor - start(b);
    if (delta !== 0) out = axis === 'horizontal' ? moveLayersBy(out, ub.units[i], delta, 0) : moveLayersBy(out, ub.units[i], 0, delta);
    cursor += end(b) - start(b) + gap;
  }
  return out;
}
```

- [ ] **Step 4: Run tests.** `npx vitest run src/features/customTee/domain/geometry.test.ts` — PASS. (Note: `scaleLayersAround` uses normalized offsets because a uniform factor scales both axes identically, so `canvas` is unused there; `rotateLayersAround` needs it.)

- [ ] **Step 5: Commit**
```bash
git add src/features/customTee/domain/geometry.ts src/features/customTee/domain/geometry.test.ts
git commit -m "feat(custom-tee): bounds, group scale/rotate, align and distribute geometry"
```

---

### Task 4: Snapping and viewport domain

**Files:**
- Create: `src/features/customTee/domain/snapping.ts`, `src/features/customTee/domain/viewport.ts`
- Test: `snapping.test.ts`, `viewport.test.ts` (same folder)

**Interfaces:**
- Consumes: `Box` from `./geometry`; `normalizeRotation` from `./layers`.
- Produces: `snapping.ts`: `Guide = { axis: 'x' | 'y'; position: number }`, `SnapResult = { dx: number; dy: number; guides: Guide[] }`, `snapBox(box: Box, targets: Box[], threshold: { x: number; y: number }): SnapResult`, `snapAngle(deg: number, step?: number, tolerance?: number, force?: boolean): number`. `viewport.ts`: `MIN_ZOOM = 0.25`, `MAX_ZOOM = 4`, `Viewport = { zoom: number; panX: number; panY: number }`, `clampZoom(z)`, `zoomAt(vp, nextZoom, cursor: {x,y}): Viewport`, `panBy(vp, dx, dy): Viewport`, `fitViewport(container: {w,h}, content: {w,h}, padding?: number): Viewport`.

- [ ] **Step 1: Write the failing tests**

`snapping.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { snapBox, snapAngle } from './snapping';

const thr = { x: 0.02, y: 0.02 };

describe('snapBox', () => {
  it('snaps the center to the canvas center and reports a guide', () => {
    const r = snapBox({ left: 0.39, top: 0.1, right: 0.59, bottom: 0.2 }, [], thr);
    expect(r.dx).toBeCloseTo(0.01);
    expect(r.dy).toBe(0);
    expect(r.guides).toContainEqual({ axis: 'x', position: 0.5 });
  });
  it('snaps edges to the canvas edges', () => {
    const r = snapBox({ left: 0.015, top: 0.3, right: 0.215, bottom: 0.4 }, [], thr);
    expect(r.dx).toBeCloseTo(-0.015);
    expect(r.guides).toContainEqual({ axis: 'x', position: 0 });
  });
  it('snaps to other layers edges and centers', () => {
    const other = { left: 0.6, top: 0.6, right: 0.8, bottom: 0.8 };
    const r = snapBox({ left: 0.1, top: 0.585, right: 0.3, bottom: 0.785 }, [other], thr);
    expect(r.dy).toBeCloseTo(0.015); // top edge to the other's top (0.6), within the threshold
    expect(r.guides).toContainEqual({ axis: 'y', position: 0.6 });
  });
  it('does not snap outside the threshold', () => {
    const r = snapBox({ left: 0.1, top: 0.1, right: 0.2, bottom: 0.2 }, [], thr);
    expect(r).toEqual({ dx: 0, dy: 0, guides: [] });
  });
  it('prefers the nearest candidate', () => {
    const r = snapBox({ left: 0.485, top: 0.1, right: 0.505, bottom: 0.2 }, [], thr);
    expect(r.dx).toBeCloseTo(0.005, 3); // center 0.495 -> 0.5
  });
});

describe('snapAngle', () => {
  it('snaps to multiples of 15 within the tolerance', () => {
    expect(snapAngle(88)).toBe(90);
    expect(snapAngle(-47)).toBe(-45);
    expect(snapAngle(3)).toBe(0);
  });
  it('leaves other angles alone, unless forced', () => {
    expect(snapAngle(52)).toBe(52);
    expect(snapAngle(52, 15, 4, true)).toBe(45);
  });
  it('wraps 180 correctly', () => {
    expect(snapAngle(178)).toBe(180);
    expect(snapAngle(-178)).toBe(180);
  });
});
```
`viewport.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { MIN_ZOOM, MAX_ZOOM, clampZoom, zoomAt, panBy, fitViewport } from './viewport';

describe('viewport', () => {
  it('clamps zoom', () => {
    expect(clampZoom(0.01)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(1.5)).toBe(1.5);
  });
  it('zooms about the cursor, keeping the point under it fixed', () => {
    const vp = { zoom: 1, panX: 0, panY: 0 };
    const next = zoomAt(vp, 2, { x: 100, y: 50 });
    expect(next.zoom).toBe(2);
    // stage point under the cursor before: (100-0)/1 = 100; after: (100 - panX)/2 must also be 100
    expect((100 - next.panX) / next.zoom).toBeCloseTo(100);
    expect((50 - next.panY) / next.zoom).toBeCloseTo(50);
  });
  it('clamps the zoom while zooming', () => {
    expect(zoomAt({ zoom: 1, panX: 0, panY: 0 }, 99, { x: 0, y: 0 }).zoom).toBe(MAX_ZOOM);
  });
  it('pans by a delta', () => {
    expect(panBy({ zoom: 1, panX: 10, panY: 20 }, 5, -5)).toEqual({ zoom: 1, panX: 15, panY: 15 });
  });
  it('fits content into a container, centered, never above 100%', () => {
    const v = fitViewport({ w: 1000, h: 600 }, { w: 520, h: 650 }, 24);
    expect(v.zoom).toBeCloseTo((600 - 48) / 650);
    expect(v.panX).toBeCloseTo((1000 - 520 * v.zoom) / 2);
    expect(v.panY).toBeCloseTo((600 - 650 * v.zoom) / 2);
    expect(fitViewport({ w: 2000, h: 2000 }, { w: 520, h: 650 }).zoom).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail.** `npx vitest run src/features/customTee/domain/snapping.test.ts src/features/customTee/domain/viewport.test.ts` — FAIL.

- [ ] **Step 3: Implement**

`snapping.ts`:
```ts
import type { Box } from './geometry';
import { normalizeRotation } from './layers';

export type Guide = { axis: 'x' | 'y'; position: number };
export type SnapResult = { dx: number; dy: number; guides: Guide[] };

const EPS = 1e-6;
const xLines = (b: Box) => [b.left, (b.left + b.right) / 2, b.right];
const yLines = (b: Box) => [b.top, (b.top + b.bottom) / 2, b.bottom];

// Finds the smallest shift (within `threshold`) that lines up one of `mine` with one of `candidates`.
function bestShift(mine: number[], candidates: number[], threshold: number): number | null {
  let best: number | null = null;
  for (const m of mine) {
    for (const c of candidates) {
      const d = c - m;
      if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    }
  }
  return best;
}

// Snaps a moving box to the canvas edges/center (0, 0.5, 1) and to the edges/centers of `targets`.
export function snapBox(box: Box, targets: Box[], threshold: { x: number; y: number }): SnapResult {
  const candX = [0, 0.5, 1, ...targets.flatMap(xLines)];
  const candY = [0, 0.5, 1, ...targets.flatMap(yLines)];
  const dx = bestShift(xLines(box), candX, threshold.x);
  const dy = bestShift(yLines(box), candY, threshold.y);
  const guides: Guide[] = [];
  const addGuides = (axis: 'x' | 'y', mine: number[], cands: number[], shift: number | null) => {
    if (shift === null) return;
    for (const m of mine) {
      for (const c of cands) {
        if (Math.abs(m + shift - c) < EPS && !guides.some((g) => g.axis === axis && Math.abs(g.position - c) < EPS)) {
          guides.push({ axis, position: c });
        }
      }
    }
  };
  addGuides('x', xLines(box), candX, dx);
  addGuides('y', yLines(box), candY, dy);
  return { dx: dx ?? 0, dy: dy ?? 0, guides };
}

// Snaps to the nearest multiple of `step` when within `tolerance` degrees (or always when `force`).
export function snapAngle(deg: number, step = 15, tolerance = 4, force = false): number {
  const nearest = Math.round(deg / step) * step;
  return force || Math.abs(deg - nearest) <= tolerance ? normalizeRotation(nearest) : deg;
}
```

`viewport.ts`:
```ts
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

// pan is the stage's top-left offset in container pixels; zoom scales the stage about its own top-left.
export type Viewport = { zoom: number; panX: number; panY: number };

export const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

// Zooms so the stage point under `cursor` (container pixels) stays under the cursor.
export function zoomAt(vp: Viewport, nextZoom: number, cursor: { x: number; y: number }): Viewport {
  const zoom = clampZoom(nextZoom);
  const ratio = zoom / vp.zoom;
  return { zoom, panX: cursor.x - (cursor.x - vp.panX) * ratio, panY: cursor.y - (cursor.y - vp.panY) * ratio };
}

export const panBy = (vp: Viewport, dx: number, dy: number): Viewport => ({ ...vp, panX: vp.panX + dx, panY: vp.panY + dy });

export function fitViewport(container: { w: number; h: number }, content: { w: number; h: number }, padding = 24): Viewport {
  const zoom = clampZoom(Math.min(1, (container.w - padding * 2) / content.w, (container.h - padding * 2) / content.h));
  return { zoom, panX: (container.w - content.w * zoom) / 2, panY: (container.h - content.h * zoom) / 2 };
}
```

- [ ] **Step 4: Run tests.** `npx vitest run src/features/customTee/domain` — PASS. Note: keep threshold comparisons away from exact float ties in tests (the snapping tests above use values with a clear margin).

- [ ] **Step 5: Commit**
```bash
git add src/features/customTee/domain/snapping.ts src/features/customTee/domain/snapping.test.ts src/features/customTee/domain/viewport.ts src/features/customTee/domain/viewport.test.ts
git commit -m "feat(custom-tee): snapping and viewport (pan/zoom) domain"
```

---

### Task 5: Multi-select studio state

**Files:**
- Rewrite: `src/features/customTee/application/useStudioState.ts`

**Interfaces:**
- Consumes: history (`createHistory, live, settle, commit, undo, redo, canUndo, canRedo`), layers (`addLayer, createImageLayer, createTextLayer, flipLayer, toggleVisible, updateLayer, type Layer, type LayerPatch, type AlignEdge`), grouping (`expandToGroups, groupLayers, ungroupLayers, removeLayers, moveUnit, reorderUnit`), geometry (`alignLayers, distributeLayers, moveLayersBy, type Size, type CanvasPx`).
- Produces: `Asset = { id; name; src; aspect }` (unchanged) and `useStudioState(initialLayersByView, viewId)` returning:
  `layers, layersByView, selectedIds: string[], selected: Layer | null` (the single selected layer, else null), `assets, canUndo, canRedo`, and functions: `select(ids: string[])`, `selectAll()`, `rememberAsset(a)`, `addImage(asset)`, `addText(init: Omit<Parameters<typeof createTextLayer>[0], 'id'>)`, `patch(id, p)`, `patchMany(ids, p)`, `patchLive(id, p)`, `patchManyLive(patches: Record<string, LayerPatch>)`, `settleGesture()`, `nudge(ids, dx, dy)`, `removeSelected()`, `removeIds(ids)`, `setVisible(ids, visible)`, `flip(id, axis)`, `group()`, `ungroup()`, `align(edge, sizes, canvas)`, `distribute(axis, sizes, canvas)`, `moveUnit(id, dir)`, `reorderUnit(id, toUnitIndex)`, `undo()`, `redo()`.

- [ ] **Step 1: Write the file**

```ts
'use client';

import { useCallback, useRef, useState } from 'react';
import { type History, createHistory, live, settle, commit, undo as undoH, redo as redoH, canUndo, canRedo } from '../domain/history';
import {
  type AlignEdge,
  type Layer,
  type LayerPatch,
  addLayer,
  createImageLayer,
  createTextLayer,
  flipLayer,
  toggleVisible,
  updateLayer,
} from '../domain/layers';
import { expandToGroups, groupLayers, moveUnit as moveUnitDomain, removeLayers, reorderUnit as reorderUnitDomain, ungroupLayers } from '../domain/grouping';
import { type CanvasPx, type Size, alignLayers, distributeLayers, moveLayersBy } from '../domain/geometry';

export type Asset = { id: string; name: string; src: string; aspect: number };
export type TextInit = Omit<Parameters<typeof createTextLayer>[0], 'id'>;

type ByView = Record<string, Layer[]>;
const EMPTY: Layer[] = [];
// Applies `fn` to one view's layers; returns the SAME record when nothing changed so history no-ops still work.
const mapView = (rec: ByView, viewId: string, fn: (ls: Layer[]) => Layer[]): ByView => {
  const current = rec[viewId] ?? EMPTY;
  const next = fn(current);
  return next === current ? rec : { ...rec, [viewId]: next };
};

export function useStudioState(initialLayersByView: ByView, viewId: string) {
  const [history, setHistory] = useState<History<ByView>>(() => createHistory(initialLayersByView));
  const [rawSelection, setRawSelection] = useState<string[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const counter = useRef(0);
  const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${counter.current++}`;

  const layersByView = history.present;
  const layers = layersByView[viewId] ?? EMPTY;
  // Validated against the active view's layers: a stale id (after undo, or on another view) is never exposed.
  const selectedIds = rawSelection.filter((id) => layers.some((l) => l.id === id));
  const selected = selectedIds.length === 1 ? (layers.find((l) => l.id === selectedIds[0]) ?? null) : null;

  const change = useCallback(
    (fn: (ls: Layer[]) => Layer[]) => setHistory((h) => commit(h, mapView(h.present, viewId, fn))),
    [viewId],
  );

  const rememberAsset = useCallback((a: Omit<Asset, 'id'>): Asset => {
    const asset = { ...a, id: `asset-${Date.now().toString(36)}-${counter.current++}` };
    setAssets((prev) => [...prev, asset]);
    return asset;
  }, []);

  const addAndSelect = useCallback(
    (layer: Layer) => {
      setHistory((h) => commit(h, mapView(h.present, viewId, (ls) => addLayer(ls, layer))));
      setRawSelection([layer.id]);
    },
    [viewId],
  );

  const addImage = useCallback(
    (a: Asset) => addAndSelect(createImageLayer({ id: nextId('layer'), name: a.name, src: a.src, aspect: a.aspect })),
    [addAndSelect], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const addText = useCallback(
    (init: TextInit) => addAndSelect(createTextLayer({ id: nextId('layer'), ...init })),
    [addAndSelect], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const applyPatches = (ls: Layer[], patches: Record<string, LayerPatch>): Layer[] => {
    let out = ls;
    for (const [id, p] of Object.entries(patches)) out = updateLayer(out, id, p);
    return out;
  };

  const removeIds = (ids: string[]) => {
    if (!layers.some((l) => ids.includes(l.id))) return;
    change((ls) => removeLayers(ls, ids));
    setRawSelection((cur) => cur.filter((id) => !ids.includes(id)));
  };

  return {
    layers,
    layersByView,
    selectedIds,
    selected,
    assets,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    select: (ids: string[]) => setRawSelection(ids),
    selectAll: () => setRawSelection(layers.filter((l) => l.visible).map((l) => l.id)),
    rememberAsset,
    addImage,
    addText,
    patch: (id: string, p: LayerPatch) => change((ls) => updateLayer(ls, id, p)),
    patchMany: (ids: string[], p: LayerPatch) => change((ls) => applyPatches(ls, Object.fromEntries(ids.map((id) => [id, p])))),
    patchLive: (id: string, p: LayerPatch) => setHistory((h) => live(h, mapView(h.present, viewId, (ls) => updateLayer(ls, id, p)))),
    patchManyLive: (patches: Record<string, LayerPatch>) => setHistory((h) => live(h, mapView(h.present, viewId, (ls) => applyPatches(ls, patches)))),
    settleGesture: () => setHistory((h) => settle(h)),
    nudge: (ids: string[], dx: number, dy: number) => change((ls) => moveLayersBy(ls, ids, dx, dy)),
    removeSelected: () => removeIds(selectedIds),
    removeIds,
    setVisible: (ids: string[], visible: boolean) =>
      change((ls) => {
        let out = ls;
        for (const l of ls) if (ids.includes(l.id) && l.visible !== visible) out = toggleVisible(out, l.id);
        return out;
      }),
    flip: (id: string, axis: 'x' | 'y') => change((ls) => flipLayer(ls, id, axis)),
    group: () => {
      const id = nextId('group');
      change((ls) => groupLayers(ls, selectedIds, id));
      setRawSelection((cur) => expandToGroups(layers, cur));
    },
    ungroup: () => change((ls) => ungroupLayers(ls, selectedIds)),
    align: (edge: AlignEdge, sizes: Record<string, Size>, canvas: CanvasPx) => change((ls) => alignLayers(ls, selectedIds, sizes, edge, canvas)),
    distribute: (axis: 'horizontal' | 'vertical', sizes: Record<string, Size>, canvas: CanvasPx) =>
      change((ls) => distributeLayers(ls, selectedIds, sizes, axis, canvas)),
    moveUnit: (id: string, dir: 'up' | 'down') => change((ls) => moveUnitDomain(ls, id, dir)),
    reorderUnit: (id: string, toUnitIndex: number) => change((ls) => reorderUnitDomain(ls, id, toUnitIndex)),
    undo: () => setHistory((h) => undoH(h)),
    redo: () => setHistory((h) => redoH(h)),
  };
}
```
Note: `toggleVisible` must return the same array when a layer's visibility already matches; the `setVisible` loop above only toggles layers whose `visible` differs, so it is safe. `align`/`distribute` no-op returns (same array) keep history clean.

- [ ] **Step 2: Typecheck.** `npx tsc --noEmit`. Expected: errors ONLY in `Canvas.tsx`, `StudioEditor.tsx`, `TextPanel.tsx`, `LayersList.tsx` (old `selectedId`, `remove`, `toggle`, `move`, `reorder`, `align`, `addText` shapes) — these are rewritten in Tasks 6-8. List them in your report. `npx vitest run` must still pass.

- [ ] **Step 3: Commit**
```bash
git add src/features/customTee/application/useStudioState.ts
git commit -m "feat(custom-tee): multi-select, groups and bulk operations in studio state"
```

---

### Task 6: Canvas rewrite (viewport, selection, snapping, groups, text editing)

**Files:**
- Rewrite: `src/features/customTee/presentation/studio/Canvas.tsx`

**Interfaces:**
- Consumes: layers (`Layer, LayerPatch, TEXT_FONT_FRACTION, scaleToPercent`), grouping (`expandToGroups, isSingleUnit, selectionUnits, toggleId`), geometry (`Box, CanvasPx, Size, boxesIntersect, layerBox, scaleLayersAround, rotateLayersAround, unionBox, boxCenter`), snapping (`Guide, snapAngle, snapBox`), viewport (`Viewport, clampZoom, fitViewport, panBy, zoomAt`).
- Produces: `Canvas` default export via `forwardRef<CanvasHandle, Props>`:
```ts
export type CanvasHandle = { zoomBy(factor: number): void; setZoom(zoom: number): void; fit(): void };
type Props = {
  baseImage?: string;
  baseAlt: string;
  layers: Layer[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onLiveChange: (patches: Record<string, LayerPatch>) => void; // during a drag
  onSettle: () => void;                                          // end of a drag
  onCommitText: (id: string, text: string) => void;             // on-canvas text edit finished
  onMeasure: (m: { stage: CanvasPx; sizes: Record<string, Size> }) => void;
  onZoomChange: (zoom: number) => void;                          // for the toolbar percent
};
```
Behavior: stage is a fixed `BASE_WIDTH_PX = 520` wide tee image + layers, positioned by `transform: translate(panX, panY) scale(zoom)` (origin 0 0) inside a fixed-height container; the viewport is internal state; the handle's `fit()` fits to the container (also done automatically when the base image loads).

- [ ] **Step 1: Write the file**

```tsx
'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { type Layer, type LayerPatch, TEXT_FONT_FRACTION, normalizeRotation, scaleToPercent } from '../../domain/layers';
import { expandToGroups, isSingleUnit } from '../../domain/grouping';
import { type Box, type CanvasPx, type Size, boxCenter, boxesIntersect, layerBox, rotateLayersAround, scaleLayersAround, unionBox } from '../../domain/geometry';
import { type Guide, snapAngle, snapBox } from '../../domain/snapping';
import { type Viewport, clampZoom, fitViewport, panBy, zoomAt } from '../../domain/viewport';

export type CanvasHandle = { zoomBy: (factor: number) => void; setZoom: (zoom: number) => void; fit: () => void };

type Props = {
  baseImage?: string;
  baseAlt: string;
  layers: Layer[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onLiveChange: (patches: Record<string, LayerPatch>) => void;
  onSettle: () => void;
  onCommitText: (id: string, text: string) => void;
  onMeasure: (m: { stage: CanvasPx; sizes: Record<string, Size> }) => void;
  onZoomChange: (zoom: number) => void;
};

type Drag =
  | { kind: 'move'; ids: string[]; startNx: number; startNy: number; start: Record<string, { x: number; y: number }>; startBox: Box; others: Box[] }
  | { kind: 'scale'; ids: string[]; anchor: { x: number; y: number }; cx: number; cy: number; startDist: number; startLayers: Layer[]; single: boolean }
  | { kind: 'rotate'; ids: string[]; anchor: { x: number; y: number }; cx: number; cy: number; startAngle: number; startLayers: Layer[]; single: boolean }
  | { kind: 'pan'; startX: number; startY: number; panX: number; panY: number }
  | { kind: 'marquee'; startNx: number; startNy: number; additive: boolean; base: string[] };

const BASE_WIDTH_PX = 520;
const SNAP_PX = 6;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const hasModifier = (e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => e.shiftKey || e.metaKey || e.ctrlKey;

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(
  { baseImage, baseAlt, layers, selectedIds, onSelect, onLiveChange, onSettle, onCommitText, onMeasure, onZoomChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const lastMeasure = useRef('');

  const [vp, setVp] = useState<Viewport>({ zoom: 1, panX: 0, panY: 0 });
  const vpRef = useRef(vp);
  vpRef.current = vp;
  const [stagePx, setStagePx] = useState<CanvasPx>({ w: BASE_WIDTH_PX, h: BASE_WIDTH_PX });
  const [sizes, setSizes] = useState<Record<string, Size>>({});
  const [guides, setGuides] = useState<Guide[]>([]);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [readout, setReadout] = useState<{ x: number; y: number; text: string } | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);

  const applyViewport = (next: Viewport) => {
    setVp(next);
    onZoomChange(next.zoom);
  };

  const fit = () => {
    const c = containerRef.current;
    const s = stageRef.current;
    if (!c || !s || !s.offsetWidth || !s.offsetHeight) return;
    applyViewport(fitViewport({ w: c.clientWidth, h: c.clientHeight }, { w: s.offsetWidth, h: s.offsetHeight }));
  };

  const zoomAbout = (factor: number | null, absolute: number | null, cursor?: { x: number; y: number }) => {
    const c = containerRef.current;
    if (!c) return;
    const at = cursor ?? { x: c.clientWidth / 2, y: c.clientHeight / 2 };
    const current = vpRef.current;
    applyViewport(zoomAt(current, absolute ?? clampZoom(current.zoom * (factor ?? 1)), at));
  };

  useImperativeHandle(ref, () => ({ zoomBy: (f) => zoomAbout(f, null), setZoom: (z) => zoomAbout(null, z), fit }));

  // Track the stage size (font sizes depend on its width).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStagePx({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Report every visible layer's unrotated box (as canvas fractions) for snapping, align and distribute.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !stage.offsetWidth || !stage.offsetHeight) return;
    const next: Record<string, Size> = {};
    for (const l of layers) {
      if (!l.visible) continue;
      const content = stage.querySelector<HTMLElement>(`[data-layer-id="${CSS.escape(l.id)}"] [data-layer-content]`);
      if (content) next[l.id] = { w: content.offsetWidth / stage.offsetWidth, h: content.offsetHeight / stage.offsetHeight };
    }
    const key = `${stage.offsetWidth}x${stage.offsetHeight}|` + Object.entries(next).map(([id, s]) => `${id}:${s.w.toFixed(4)},${s.h.toFixed(4)}`).join(';');
    if (key !== lastMeasure.current) {
      lastMeasure.current = key;
      setSizes(next);
      onMeasure({ stage: { w: stage.offsetWidth, h: stage.offsetHeight }, sizes: next });
    }
  });

  // Wheel pans; Ctrl/Cmd+wheel (and trackpad pinch) zooms about the cursor. Needs a non-passive listener.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const current = vpRef.current;
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        applyViewport(zoomAt(current, current.zoom * Math.exp(-e.deltaY * 0.01), { x: e.clientX - rect.left, y: e.clientY - rect.top }));
      } else {
        applyViewport(panBy(current, -e.deltaX, -e.deltaY));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Space + drag pans.
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !typing(e.target)) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false);
    };
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
    };
  }, []);

  const stageRect = () => stageRef.current!.getBoundingClientRect();
  const norm = (e: { clientX: number; clientY: number }) => {
    const r = stageRect();
    return { nx: (e.clientX - r.left) / r.width, ny: (e.clientY - r.top) / r.height };
  };
  const boxFor = (l: Layer): Box | null => (sizes[l.id] ? layerBox(l, sizes[l.id], stagePx) : null);
  const boxesOf = (ls: Layer[]): Box[] => ls.map(boxFor).filter((b): b is Box => b !== null);

  const startMove = (e: React.PointerEvent, ids: string[]) => {
    const picked = layers.filter((l) => ids.includes(l.id));
    const startBox = unionBox(boxesOf(picked));
    if (!startBox) return;
    const { nx, ny } = norm(e);
    drag.current = {
      kind: 'move',
      ids,
      startNx: nx,
      startNy: ny,
      start: Object.fromEntries(picked.map((l) => [l.id, { x: l.x, y: l.y }])),
      startBox,
      others: boxesOf(layers.filter((l) => l.visible && !ids.includes(l.id))),
    };
  };

  const onLayerPointerDown = (e: React.PointerEvent, layer: Layer) => {
    e.stopPropagation();
    if (editingId === layer.id) return; // let the text field handle it
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const unit = expandToGroups(layers, [layer.id]);
    let ids: string[];
    if (hasModifier(e)) {
      const allIn = unit.every((id) => selectedIds.includes(id));
      ids = allIn ? selectedIds.filter((id) => !unit.includes(id)) : [...new Set([...selectedIds, ...unit])];
    } else if (selectedIds.includes(layer.id)) {
      ids = selectedIds; // keep the selection and move all of it
    } else {
      ids = unit;
    }
    onSelect(ids);
    if (ids.length > 0) startMove(e, ids);
  };

  const onHandlePointerDown = (e: React.PointerEvent, kind: 'scale' | 'rotate') => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const picked = layers.filter((l) => selectedIds.includes(l.id));
    const union = unionBox(boxesOf(picked));
    if (!union || picked.length === 0) return;
    const single = picked.length === 1;
    const anchor = single ? { x: picked[0].x, y: picked[0].y } : boxCenter(union);
    const r = stageRect();
    const cx = r.left + anchor.x * r.width;
    const cy = r.top + anchor.y * r.height;
    if (kind === 'scale') {
      drag.current = { kind, ids: selectedIds, anchor, cx, cy, startDist: Math.max(1, Math.hypot(e.clientX - cx, e.clientY - cy)), startLayers: picked, single };
    } else {
      drag.current = { kind, ids: selectedIds, anchor, cx, cy, startAngle: toDeg(Math.atan2(e.clientY - cy, e.clientX - cx)), startLayers: picked, single };
    }
  };

  const onContainerPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).hasAttribute('data-stage-bg')) return;
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, panX: vp.panX, panY: vp.panY };
      return;
    }
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { nx, ny } = norm(e);
    const additive = hasModifier(e);
    drag.current = { kind: 'marquee', startNx: nx, startNy: ny, additive, base: additive ? selectedIds : [] };
    if (!additive) onSelect([]);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'pan') {
      applyViewport({ ...vpRef.current, panX: d.panX + (e.clientX - d.startX), panY: d.panY + (e.clientY - d.startY) });
      return;
    }
    const r = stageRect();
    if (d.kind === 'marquee') {
      const { nx, ny } = norm(e);
      const box: Box = { left: Math.min(d.startNx, nx), top: Math.min(d.startNy, ny), right: Math.max(d.startNx, nx), bottom: Math.max(d.startNy, ny) };
      setMarquee(box);
      const hit = layers.filter((l) => l.visible && boxFor(l) && boxesIntersect(boxFor(l)!, box)).map((l) => l.id);
      onSelect([...new Set([...d.base, ...expandToGroups(layers, hit)])]);
      return;
    }
    if (d.kind === 'move') {
      const { nx, ny } = norm(e);
      let dx = nx - d.startNx;
      let dy = ny - d.startNy;
      let found: Guide[] = [];
      if (!e.altKey) {
        const moved: Box = { left: d.startBox.left + dx, right: d.startBox.right + dx, top: d.startBox.top + dy, bottom: d.startBox.bottom + dy };
        const snap = snapBox(moved, d.others, { x: SNAP_PX / r.width, y: SNAP_PX / r.height });
        dx += snap.dx;
        dy += snap.dy;
        found = snap.guides;
      }
      setGuides(found);
      onLiveChange(Object.fromEntries(d.ids.map((id) => [id, { x: d.start[id].x + dx, y: d.start[id].y + dy }])));
      return;
    }
    if (d.kind === 'scale') {
      const factor = Math.max(0.05, Math.hypot(e.clientX - d.cx, e.clientY - d.cy) / d.startDist);
      const next = scaleLayersAround(d.startLayers, d.ids, factor, d.anchor, stagePx);
      onLiveChange(Object.fromEntries(next.map((l) => [l.id, { x: l.x, y: l.y, scale: l.scale }])));
      const text = d.single ? `${scaleToPercent(next[0].scale)}%` : `${Math.round(factor * 100)}%`;
      const cr = containerRef.current!.getBoundingClientRect();
      setReadout({ x: e.clientX - cr.left + 14, y: e.clientY - cr.top + 14, text });
      return;
    }
    // rotate
    const raw = toDeg(Math.atan2(e.clientY - d.cy, e.clientX - d.cx)) - d.startAngle;
    const base = d.single ? d.startLayers[0].rotation : 0;
    const snapped = snapAngle(normalizeRotation(base + raw), 15, 4, e.shiftKey);
    const delta = snapped - base;
    const next = rotateLayersAround(d.startLayers, d.ids, delta, d.anchor, stagePx);
    onLiveChange(Object.fromEntries(next.map((l) => [l.id, { x: l.x, y: l.y, rotation: l.rotation }])));
    const cr = containerRef.current!.getBoundingClientRect();
    setReadout({ x: e.clientX - cr.left + 14, y: e.clientY - cr.top + 14, text: `${Math.round(normalizeRotation(base + delta))}°` });
  };

  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    setGuides([]);
    setMarquee(null);
    setReadout(null);
    if (d && d.kind !== 'pan' && d.kind !== 'marquee') onSettle();
  };

  // ----- selection chrome -----
  const selectedLayers = layers.filter((l) => selectedIds.includes(l.id) && l.visible);
  const showHandles = selectedLayers.length > 0 && isSingleUnit(layers, selectedIds) && editingId === null;
  const single = selectedLayers.length === 1 ? selectedLayers[0] : null;
  const selectionBox = selectedLayers.length > 1 ? unionBox(boxesOf(selectedLayers)) : null;
  const px = (n: number) => n / vp.zoom; // keep chrome a constant on-screen size at any zoom
  const handle = (extra: React.CSSProperties, cursor: string, kind: 'scale' | 'rotate') => (
    <span
      aria-hidden="true"
      onPointerDown={(e) => onHandlePointerDown(e, kind)}
      style={{ position: 'absolute', width: px(12), height: px(12), background: '#fff', border: `${px(1.5)}px solid #000`, borderRadius: kind === 'rotate' ? '50%' : px(2), cursor, touchAction: 'none', pointerEvents: 'auto', ...extra }}
    />
  );

  return (
    <div
      ref={containerRef}
      data-canvas-container
      onPointerDown={onContainerPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="relative h-[calc(100vh-15rem)] min-h-[420px] w-full overflow-hidden"
      style={{ cursor: spaceDown ? 'grab' : 'default', touchAction: 'none' }}
    >
      <div
        ref={stageRef}
        data-stage-bg
        className="absolute left-0 top-0 select-none"
        style={{ width: BASE_WIDTH_PX, transform: `translate(${vp.panX}px, ${vp.panY}px) scale(${vp.zoom})`, transformOrigin: '0 0' }}
      >
        {baseImage ? (
          <img
            src={baseImage}
            alt={baseAlt}
            draggable={false}
            onLoad={fit}
            data-stage-bg
            className="block h-auto w-full select-none"
          />
        ) : (
          <div data-stage-bg className="aspect-square w-full bg-[#EEEEEE]" />
        )}

        {layers
          .filter((l) => l.visible)
          .map((layer) => {
            const isSelected = selectedIds.includes(layer.id);
            const isEditing = editingId === layer.id && layer.type === 'text';
            return (
              <div
                key={layer.id}
                data-layer-id={layer.id}
                onPointerDown={(e) => onLayerPointerDown(e, layer)}
                onDoubleClick={() => {
                  onSelect([layer.id]);
                  if (layer.type === 'text') setEditingId(layer.id);
                }}
                onPointerEnter={() => setHoverId(layer.id)}
                onPointerLeave={() => setHoverId((h) => (h === layer.id ? null : h))}
                className="absolute"
                style={{
                  left: `${layer.x * 100}%`,
                  top: `${layer.y * 100}%`,
                  width: layer.type === 'image' ? `${layer.scale * 100}%` : undefined,
                  transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                  cursor: isEditing ? 'text' : 'move',
                  touchAction: 'none',
                  outline: isSelected ? `${px(1.5)}px ${showHandles && single ? 'dashed' : 'solid'} #000` : hoverId === layer.id && !drag.current ? `${px(1)}px solid rgba(0,0,0,.45)` : 'none',
                }}
              >
                <div
                  data-layer-content
                  style={{
                    transform: `scale(${layer.flipX ? -1 : 1}, ${layer.flipY ? -1 : 1})`,
                    opacity: layer.opacity,
                    ...(layer.type === 'text'
                      ? {
                          fontSize: `${layer.scale * TEXT_FONT_FRACTION * stagePx.w}px`,
                          fontFamily: layer.fontFamily,
                          fontWeight: layer.bold ? 700 : 400,
                          fontStyle: layer.italic ? 'italic' : 'normal',
                          textAlign: layer.align,
                          letterSpacing: `${layer.letterSpacing}em`,
                          color: layer.color,
                          whiteSpace: 'pre' as const,
                          lineHeight: 1.15,
                        }
                      : {}),
                  }}
                >
                  {layer.type === 'image' ? (
                    <img src={layer.src} alt={layer.name} draggable={false} className="pointer-events-none block h-auto w-full select-none" />
                  ) : isEditing ? (
                    <TextEditor
                      initial={layer.text}
                      width={Math.max(40, (sizes[layer.id]?.w ?? 0.2) * stagePx.w + 24)}
                      onDone={(value, commit) => {
                        setEditingId(null);
                        if (commit) onCommitText(layer.id, value);
                      }}
                    />
                  ) : (
                    layer.text
                  )}
                </div>

                {isSelected && showHandles && single && single.id === layer.id && (
                  <>
                    {handle({ left: 0, top: 0, transform: 'translate(-50%,-50%)' }, 'nwse-resize', 'scale')}
                    {handle({ right: 0, top: 0, transform: 'translate(50%,-50%)' }, 'nesw-resize', 'scale')}
                    {handle({ left: 0, bottom: 0, transform: 'translate(-50%,50%)' }, 'nesw-resize', 'scale')}
                    {handle({ right: 0, bottom: 0, transform: 'translate(50%,50%)' }, 'nwse-resize', 'scale')}
                    <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: px(-22), width: px(1.5), height: px(18), background: '#000', transform: 'translateX(-50%)' }} />
                    {handle({ left: '50%', top: px(-34), transform: 'translateX(-50%)' }, 'grab', 'rotate')}
                  </>
                )}
              </div>
            );
          })}

        {/* Group / multi-selection bounding box (with handles when the selection is one whole group). */}
        {selectionBox && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: `${selectionBox.left * 100}%`,
              top: `${selectionBox.top * 100}%`,
              width: `${(selectionBox.right - selectionBox.left) * 100}%`,
              height: `${(selectionBox.bottom - selectionBox.top) * 100}%`,
              outline: `${px(1.5)}px dashed #000`,
            }}
          >
            {showHandles && (
              <div className="pointer-events-none absolute inset-0">
                {handle({ left: 0, top: 0, transform: 'translate(-50%,-50%)' }, 'nwse-resize', 'scale')}
                {handle({ right: 0, top: 0, transform: 'translate(50%,-50%)' }, 'nesw-resize', 'scale')}
                {handle({ left: 0, bottom: 0, transform: 'translate(-50%,50%)' }, 'nesw-resize', 'scale')}
                {handle({ right: 0, bottom: 0, transform: 'translate(50%,50%)' }, 'nwse-resize', 'scale')}
                <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: px(-22), width: px(1.5), height: px(18), background: '#000', transform: 'translateX(-50%)' }} />
                {handle({ left: '50%', top: px(-34), transform: 'translateX(-50%)' }, 'grab', 'rotate')}
              </div>
            )}
          </div>
        )}

        {/* Smart guides */}
        {guides.map((g) => (
          <div
            key={`${g.axis}-${g.position}`}
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={
              g.axis === 'x'
                ? { left: `${g.position * 100}%`, top: 0, bottom: 0, width: px(1), background: '#000', boxShadow: `0 0 0 ${px(0.75)}px rgba(255,255,255,.9)` }
                : { top: `${g.position * 100}%`, left: 0, right: 0, height: px(1), background: '#000', boxShadow: `0 0 0 ${px(0.75)}px rgba(255,255,255,.9)` }
            }
          />
        ))}

        {/* Marquee */}
        {marquee && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: `${marquee.left * 100}%`,
              top: `${marquee.top * 100}%`,
              width: `${(marquee.right - marquee.left) * 100}%`,
              height: `${(marquee.bottom - marquee.top) * 100}%`,
              border: `${px(1)}px dashed #000`,
              background: 'rgba(0,0,0,.06)',
            }}
          />
        )}
      </div>

      {readout && (
        <div className="pointer-events-none absolute rounded-md bg-black px-2 py-1 text-[11px] font-semibold text-white" style={{ left: readout.x, top: readout.y }}>
          {readout.text}
        </div>
      )}
    </div>
  );
});

export default Canvas;

// In-place text editor: a textarea that inherits the layer's font styling. Enter adds a line; blur commits; Escape cancels.
function TextEditor({ initial, width, onDone }: { initial: string; width: number; onDone: (value: string, commit: boolean) => void }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  const finished = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const finish = (commit: boolean) => {
    if (finished.current) return;
    finished.current = true;
    onDone(value, commit && value.trim().length > 0);
  };
  return (
    <textarea
      ref={ref}
      value={value}
      aria-label="Edit text"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation(); // keep studio shortcuts (Delete, arrows, Cmd+Z) out of the editor
        if (e.key === 'Escape') finish(false);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      rows={Math.max(1, value.split('\n').length)}
      style={{
        width,
        font: 'inherit',
        letterSpacing: 'inherit',
        color: 'inherit',
        textAlign: 'inherit',
        lineHeight: 'inherit',
        background: 'rgba(255,255,255,.7)',
        border: 'none',
        outline: 'none',
        resize: 'none',
        overflow: 'hidden',
        whiteSpace: 'pre',
        padding: 0,
        margin: 0,
        display: 'block',
      }}
    />
  );
}
```
Notes: (1) `fit` is also invoked from `onLoad` of the base image. (2) The `Canvas` no longer scrolls; the container is a fixed-height viewport. (3) `unionBox`/`boxCenter` usages require `sizes` to have been measured (first render after mount); handlers guard with null checks.

- [ ] **Step 2: Typecheck.** `npx tsc --noEmit` — expected errors only in `StudioEditor.tsx`, `TextPanel.tsx`, `LayersList.tsx` (old props), fixed in Tasks 7-8; `Canvas.tsx` itself must be clean.

- [ ] **Step 3: Commit**
```bash
git add src/features/customTee/presentation/studio/Canvas.tsx
git commit -m "feat(custom-tee): canvas with pan/zoom, marquee, groups, snapping guides and on-canvas text editing"
```

---

### Task 7: Properties panels, left Text tab, layers list, toolbar

**Files:**
- Create under `src/features/customTee/presentation/studio/`: `TextAddPanel.tsx`, `AppearanceSection.tsx`, `TextInspector.tsx`, `ImageInspector.tsx`, `SelectionInspector.tsx`, `AlignPanel.tsx`
- Rewrite: `LayersList.tsx`; Modify: `PositionScalePanel.tsx`, `StudioToolbar.tsx`; Delete: `TextPanel.tsx`

**Interfaces:**
- Consumes: layers (`TextLayer, ImageLayer, Layer, LayerPatch, AlignEdge, TEXT_PRESETS, FONT_OPTIONS, MAX_TEXT_LENGTH, MIN_OPACITY, MIN_SCALE, MAX_SCALE, MIN_LETTER_SPACING, MAX_LETTER_SPACING, scaleToPercent, percentToScale`), grouping (`stackUnits`), existing `Select` (`../Select`).
- Produces (all default exports):
  - `TextAddPanel({ onAdd(init: { text: string; scale: number; bold: boolean }): void })`.
  - `AppearanceSection({ opacity: number; onLive(opacity: number): void; onSettle(): void })`.
  - `TextInspector({ layer: TextLayer; onLive(patch: LayerPatch): void; onCommit(patch: LayerPatch): void; onSettle(): void })`.
  - `ImageInspector({ layer: ImageLayer; onLive(patch: LayerPatch): void; onSettle(): void })`.
  - `SelectionInspector({ count: number; isGroup: boolean; canGroup: boolean; onGroup(): void; onUngroup(): void; onDelete(): void; opacity: number; onOpacityLive(v: number): void; onSettle(): void })`.
  - `AlignPanel({ disabled: boolean; canDistribute: boolean; onAlign(edge: AlignEdge): void; onDistribute(axis: 'horizontal' | 'vertical'): void })`.
  - `LayersList({ layers: Layer[]; selectedIds: string[]; onSelect(ids: string[]): void; onSetVisible(ids: string[], visible: boolean): void; onRemove(ids: string[]): void; onMoveUnit(id: string, dir: 'up' | 'down'): void; onReorderUnit(id: string, toUnitIndex: number): void })`.
  - `PositionScalePanel({ layer: Layer | null; onFlip(axis: 'x'|'y'): void; onScaleLive(scale: number): void; onSettle(): void })` — the align row is REMOVED (moved to `AlignPanel`); keeps Flip and Scale (slider + % box with the existing draft behavior).
  - `StudioToolbar` props: replace `zoom`/`onZoom` with `zoom: number` (multiplier, for the percent label), `onZoomIn(): void`, `onZoomOut(): void`, `onZoomReset(): void` (clicking the percent label), `onFit(): void`; keep undo/redo/views/fullscreen props. Zoom in/out are disabled at 4x / 0.25x.

- [ ] **Step 1: `TextAddPanel.tsx`**

```tsx
'use client';

import { TEXT_PRESETS } from '../../domain/layers';

type Props = { onAdd: (init: { text: string; scale: number; bold: boolean }) => void };

const PREVIEW: Record<string, string> = { heading: 'text-2xl font-bold', subheading: 'text-base font-bold', body: 'text-sm' };

export default function TextAddPanel({ onAdd }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-black">Text</h2>
      <div className="space-y-2">
        {TEXT_PRESETS.map((p) => (
          <button
            key={p.kind}
            type="button"
            onClick={() => onAdd({ text: p.text, scale: p.scale, bold: p.bold })}
            className="w-full rounded-lg border border-[#EEEEEE] bg-white px-4 py-4 text-left text-black hover:border-black"
          >
            <span className={PREVIEW[p.kind]}>{p.label}</span>
          </button>
        ))}
      </div>
      <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">
        Select text on the canvas to style it in the Properties panel on the right. Double-click text to edit it in place.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: `AppearanceSection.tsx`**

```tsx
'use client';

import { MIN_OPACITY } from '../../domain/layers';

type Props = { opacity: number; onLive: (opacity: number) => void; onSettle: () => void };

const LABEL = 'mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#717171]';

export default function AppearanceSection({ opacity, onLive, onSettle }: Props) {
  const percent = Math.round(opacity * 100);
  return (
    <div>
      <label htmlFor="layer-opacity" className={LABEL}>
        Opacity · {percent}%
      </label>
      <input
        id="layer-opacity"
        type="range"
        min={Math.round(MIN_OPACITY * 100)}
        max={100}
        value={percent}
        onChange={(e) => onLive(Number(e.target.value) / 100)}
        onPointerUp={onSettle}
        onKeyUp={onSettle}
        onBlur={onSettle}
        className="w-full accent-black"
      />
    </div>
  );
}
```

- [ ] **Step 3: `ImageInspector.tsx`**

```tsx
'use client';

import type { ImageLayer, LayerPatch } from '../../domain/layers';
import AppearanceSection from './AppearanceSection';

type Props = { layer: ImageLayer; onLive: (patch: LayerPatch) => void; onSettle: () => void };

export default function ImageInspector({ layer, onLive, onSettle }: Props) {
  return (
    <div className="space-y-4">
      <p className="truncate text-xs font-semibold text-black">{layer.name}</p>
      <AppearanceSection opacity={layer.opacity} onLive={(opacity) => onLive({ opacity })} onSettle={onSettle} />
    </div>
  );
}
```

- [ ] **Step 4: `TextInspector.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic } from 'lucide-react';
import {
  FONT_OPTIONS,
  MAX_LETTER_SPACING,
  MAX_SCALE,
  MAX_TEXT_LENGTH,
  MIN_LETTER_SPACING,
  MIN_SCALE,
  type LayerPatch,
  type TextAlign,
  type TextLayer,
  percentToScale,
  scaleToPercent,
} from '../../domain/layers';
import Select from '../Select';
import AppearanceSection from './AppearanceSection';

type Props = {
  layer: TextLayer;
  onLive: (patch: LayerPatch) => void;
  onCommit: (patch: LayerPatch) => void;
  onSettle: () => void;
};

const LABEL = 'mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#717171]';
const TOGGLE = 'flex h-9 w-9 items-center justify-center rounded-lg border text-black transition-colors';
const fontLabels = FONT_OPTIONS.map((f) => f.label);
const labelFor = (family: string) => FONT_OPTIONS.find((f) => f.family === family)?.label ?? FONT_OPTIONS[0].label;
const familyFor = (label: string) => FONT_OPTIONS.find((f) => f.label === label)?.family ?? FONT_OPTIONS[0].family;
const ALIGNS: { value: TextAlign; label: string; icon: typeof AlignLeft }[] = [
  { value: 'left', label: 'Align text left', icon: AlignLeft },
  { value: 'center', label: 'Align text center', icon: AlignCenter },
  { value: 'right', label: 'Align text right', icon: AlignRight },
];

const MIN_SIZE = scaleToPercent(MIN_SCALE);
const MAX_SIZE = scaleToPercent(MAX_SCALE);

export default function TextInspector({ layer, onLive, onCommit, onSettle }: Props) {
  const [draft, setDraft] = useState(layer.text);
  // Keep the field in sync with the layer (undo/redo, on-canvas edits) unless the user is typing in it.
  useEffect(() => {
    if (document.activeElement?.id !== 'text-content') setDraft(layer.text);
  }, [layer.text]);

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="text-content" className={LABEL}>Text</label>
        <textarea
          id="text-content"
          rows={3}
          maxLength={MAX_TEXT_LENGTH}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value.trim()) onLive({ text: e.target.value, name: e.target.value.split('\n')[0].slice(0, 24) });
          }}
          onBlur={() => {
            if (!draft.trim()) setDraft(layer.text); // a text layer can't be empty
            onSettle();
          }}
          className="w-full resize-none rounded-lg border border-[#EEEEEE] bg-white px-4 py-3 text-sm text-black focus:border-black focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="text-font" className={LABEL}>Font</label>
        <Select
          id="text-font"
          value={labelFor(layer.fontFamily)}
          options={fontLabels}
          placeholder="Select a font"
          onChange={(label) => onCommit({ fontFamily: familyFor(label) })}
        />
      </div>

      <div>
        <label htmlFor="text-size" className={LABEL}>Size · {scaleToPercent(layer.scale)}%</label>
        <input
          id="text-size"
          type="range"
          min={MIN_SIZE}
          max={MAX_SIZE}
          value={scaleToPercent(layer.scale)}
          onChange={(e) => onLive({ scale: percentToScale(Number(e.target.value)) })}
          onPointerUp={onSettle}
          onKeyUp={onSettle}
          onBlur={onSettle}
          className="w-full accent-black"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Bold"
          aria-pressed={layer.bold}
          onClick={() => onCommit({ bold: !layer.bold })}
          className={`${TOGGLE} ${layer.bold ? 'border-black bg-black text-white' : 'border-[#EEEEEE] hover:border-black'}`}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Italic"
          aria-pressed={layer.italic}
          onClick={() => onCommit({ italic: !layer.italic })}
          className={`${TOGGLE} ${layer.italic ? 'border-black bg-black text-white' : 'border-[#EEEEEE] hover:border-black'}`}
        >
          <Italic className="h-4 w-4" />
        </button>
        <span className="mx-1 h-6 w-px bg-[#EEEEEE]" aria-hidden="true" />
        {ALIGNS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={layer.align === value}
            onClick={() => onCommit({ align: value })}
            className={`${TOGGLE} ${layer.align === value ? 'border-black bg-black text-white' : 'border-[#EEEEEE] hover:border-black'}`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="text-spacing" className={LABEL}>Letter spacing · {Math.round(layer.letterSpacing * 100)}%</label>
        <input
          id="text-spacing"
          type="range"
          min={Math.round(MIN_LETTER_SPACING * 100)}
          max={Math.round(MAX_LETTER_SPACING * 100)}
          value={Math.round(layer.letterSpacing * 100)}
          onChange={(e) => onLive({ letterSpacing: Number(e.target.value) / 100 })}
          onPointerUp={onSettle}
          onKeyUp={onSettle}
          onBlur={onSettle}
          className="w-full accent-black"
        />
      </div>

      <div>
        <label htmlFor="text-color" className={LABEL}>Color</label>
        <input
          id="text-color"
          type="color"
          value={layer.color}
          onChange={(e) => onLive({ color: e.target.value })}
          onBlur={onSettle}
          className="h-11 w-full cursor-pointer rounded-lg border border-[#EEEEEE] bg-white p-1"
        />
      </div>

      <AppearanceSection opacity={layer.opacity} onLive={(opacity) => onLive({ opacity })} onSettle={onSettle} />
    </div>
  );
}
```

- [ ] **Step 5: `SelectionInspector.tsx`**

```tsx
'use client';

import { Group, Trash2, Ungroup } from 'lucide-react';
import AppearanceSection from './AppearanceSection';

type Props = {
  count: number;
  isGroup: boolean;
  canGroup: boolean;
  onGroup: () => void;
  onUngroup: () => void;
  onDelete: () => void;
  opacity: number;
  onOpacityLive: (v: number) => void;
  onSettle: () => void;
};

const BTN = 'flex items-center justify-center gap-2 rounded-lg border border-[#EEEEEE] px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-black hover:border-black disabled:cursor-not-allowed disabled:text-[#CDCDCD] disabled:hover:border-[#EEEEEE]';

export default function SelectionInspector({ count, isGroup, canGroup, onGroup, onUngroup, onDelete, opacity, onOpacityLive, onSettle }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-black">{isGroup ? `Group · ${count} layers` : `${count} layers selected`}</p>
      <div className="grid grid-cols-2 gap-2">
        {isGroup ? (
          <button type="button" onClick={onUngroup} className={BTN}>
            <Ungroup className="h-4 w-4" />
            Ungroup
          </button>
        ) : (
          <button type="button" onClick={onGroup} disabled={!canGroup} className={BTN}>
            <Group className="h-4 w-4" />
            Group
          </button>
        )}
        <button type="button" onClick={onDelete} className={`${BTN} hover:!border-red-600 hover:!text-red-600`}>
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
      <p className="text-[10px] text-[#717171]">Shortcuts: Cmd/Ctrl+G group, Cmd/Ctrl+Shift+G ungroup.</p>
      <AppearanceSection opacity={opacity} onLive={onOpacityLive} onSettle={onSettle} />
    </div>
  );
}
```

- [ ] **Step 6: `AlignPanel.tsx`**

```tsx
'use client';

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
} from 'lucide-react';
import type { AlignEdge } from '../../domain/layers';

type Props = {
  disabled: boolean;
  canDistribute: boolean;
  onAlign: (edge: AlignEdge) => void;
  onDistribute: (axis: 'horizontal' | 'vertical') => void;
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

export default function AlignPanel({ disabled, canDistribute, onAlign, onDistribute }: Props) {
  return (
    <div>
      <span className={LABEL}>Position</span>
      <div className="flex flex-wrap gap-1.5">
        {ALIGN.map(({ edge, label, icon: Icon }) => (
          <button key={edge} type="button" aria-label={label} title={label} disabled={disabled} onClick={() => onAlign(edge)} className={ICON_BTN}>
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <span className="mx-1 h-9 w-px bg-[#EEEEEE]" aria-hidden="true" />
        <button type="button" aria-label="Distribute horizontally" title="Distribute horizontally" disabled={disabled || !canDistribute} onClick={() => onDistribute('horizontal')} className={ICON_BTN}>
          <AlignHorizontalDistributeCenter className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Distribute vertically" title="Distribute vertically" disabled={disabled || !canDistribute} onClick={() => onDistribute('vertical')} className={ICON_BTN}>
          <AlignVerticalDistributeCenter className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Modify `PositionScalePanel.tsx`.** Read it; remove the align row and its imports/`ALIGN` array and the `size`/`onAlign` props; keep the Flip buttons and the Scale section (slider + % box with its existing local-draft behavior). New props: `{ layer: Layer | null; onFlip; onScaleLive; onSettle }`. The two columns layout collapses: render Flip then Scale stacked.

- [ ] **Step 8: Rewrite `LayersList.tsx`**

```tsx
'use client';

import { useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, Folder, GripVertical, Trash2, Type } from 'lucide-react';
import type { Layer } from '../../domain/layers';
import { stackUnits } from '../../domain/grouping';

type Props = {
  layers: Layer[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onSetVisible: (ids: string[], visible: boolean) => void;
  onRemove: (ids: string[]) => void;
  onMoveUnit: (id: string, dir: 'up' | 'down') => void;
  onReorderUnit: (id: string, toUnitIndex: number) => void;
};

const ICON_BTN = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#717171] hover:bg-[#F5F5F5] hover:text-black disabled:cursor-not-allowed disabled:opacity-30';

// Shows the stack top-first; a group is one expandable row, and reordering moves whole units.
export default function LayersList({ layers, selectedIds, onSelect, onSetVisible, onRemove, onMoveUnit, onReorderUnit }: Props) {
  const dragId = useRef<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const units = stackUnits(layers);
  const byId = new Map(layers.map((l) => [l.id, l]));
  const hasMods = (e: React.MouseEvent) => e.shiftKey || e.metaKey || e.ctrlKey;

  if (layers.length === 0) {
    return <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">No layers yet. Upload an image or add text to start.</p>;
  }

  const select = (e: React.MouseEvent, ids: string[]) => {
    if (hasMods(e)) {
      const allIn = ids.every((id) => selectedIds.includes(id));
      onSelect(allIn ? selectedIds.filter((id) => !ids.includes(id)) : [...new Set([...selectedIds, ...ids])]);
    } else {
      onSelect(ids);
    }
  };

  const layerRow = (layer: Layer, nested: boolean) => {
    const isSelected = selectedIds.includes(layer.id);
    return (
      <li key={layer.id} className={`flex items-center gap-1 rounded-lg border px-1.5 py-1.5 ${nested ? 'ml-6' : ''} ${isSelected ? 'border-black bg-[#FAF9F6]' : 'border-[#EEEEEE] bg-white'} ${layer.visible ? '' : 'opacity-60'}`}>
        <button type="button" onClick={(e) => select(e, [layer.id])} aria-pressed={isSelected} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#F5F5F5]">
            {layer.type === 'image' ? <img src={layer.src} alt="" className="h-full w-full object-contain" /> : <Type className="h-4 w-4 text-[#717171]" />}
          </span>
          <span className="truncate text-xs text-black">{layer.name}</span>
        </button>
        <button type="button" aria-label={layer.visible ? 'Hide layer' : 'Show layer'} onClick={() => onSetVisible([layer.id], !layer.visible)} className={ICON_BTN}>
          {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button type="button" aria-label="Delete layer" onClick={() => onRemove([layer.id])} className={ICON_BTN}>
          <Trash2 className="h-4 w-4" />
        </button>
      </li>
    );
  };

  return (
    <ul className="space-y-1.5" aria-label="Design layers">
      {units
        .map((unit, unitIndex) => ({ unit, unitIndex }))
        .reverse()
        .map(({ unit, unitIndex }) => {
          const head = unit[0];
          const members = unit.map((id) => byId.get(id)!).reverse(); // top-first
          const isGroup = unit.length > 1;
          const allSelected = unit.every((id) => selectedIds.includes(id));
          const anyVisible = members.some((m) => m.visible);
          const expanded = open[head] ?? true;
          return (
            <li
              key={unit.join('|')}
              draggable
              onDragStart={(e) => {
                dragId.current = head;
                e.dataTransfer.setData('text/plain', head);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                dragId.current = null;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId.current && !unit.includes(dragId.current)) onReorderUnit(dragId.current, unitIndex);
                dragId.current = null;
              }}
              className="list-none"
            >
              {isGroup ? (
                <>
                  <div className={`flex items-center gap-1 rounded-lg border px-1.5 py-1.5 ${allSelected ? 'border-black bg-[#FAF9F6]' : 'border-[#EEEEEE] bg-white'} ${anyVisible ? '' : 'opacity-60'}`}>
                    <span className="cursor-grab text-[#CDCDCD]" aria-hidden="true">
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <button type="button" aria-label={expanded ? 'Collapse group' : 'Expand group'} onClick={() => setOpen((o) => ({ ...o, [head]: !expanded }))} className={ICON_BTN}>
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={(e) => select(e, unit)} aria-pressed={allSelected} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <Folder className="h-4 w-4 shrink-0 text-[#717171]" />
                      <span className="truncate text-xs font-semibold text-black">Group · {unit.length}</span>
                    </button>
                    <button type="button" aria-label="Move group up" disabled={unitIndex === units.length - 1} onClick={() => onMoveUnit(head, 'up')} className={ICON_BTN}>
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Move group down" disabled={unitIndex === 0} onClick={() => onMoveUnit(head, 'down')} className={ICON_BTN}>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={anyVisible ? 'Hide group' : 'Show group'} onClick={() => onSetVisible(unit, !anyVisible)} className={ICON_BTN}>
                      {anyVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button type="button" aria-label="Delete group" onClick={() => onRemove(unit)} className={ICON_BTN}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {expanded && <ul className="mt-1.5 space-y-1.5">{members.map((m) => layerRow(m, true))}</ul>}
                </>
              ) : (
                <div className="flex items-stretch gap-1">
                  <span className="flex cursor-grab items-center text-[#CDCDCD]" aria-hidden="true">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <ul className="min-w-0 flex-1">{layerRow(members[0], false)}</ul>
                  <div className="flex flex-col justify-center">
                    <button type="button" aria-label="Move layer up" disabled={unitIndex === units.length - 1} onClick={() => onMoveUnit(head, 'up')} className={ICON_BTN}>
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Move layer down" disabled={unitIndex === 0} onClick={() => onMoveUnit(head, 'down')} className={ICON_BTN}>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
    </ul>
  );
}
```
(Group rows and lone-layer rows each have their own up/down buttons.)

- [ ] **Step 9: Modify `StudioToolbar.tsx`.** Read it. Replace the zoom group with: Zoom out button (`onZoomOut`, disabled when `zoom <= 0.25`), a percent button showing `{Math.round(zoom*100)}%` (`onClick={onZoomReset}`, `aria-label="Reset zoom to 100%"`), Zoom in (`onZoomIn`, disabled when `zoom >= 4`), a Fit button (`Maximize` icon from lucide, `aria-label="Fit to screen"`, `onClick={onFit}`), then the existing fullscreen button. Update the Props type accordingly (remove `onZoom`).

- [ ] **Step 10: Delete `TextPanel.tsx`** (`git rm`). Typecheck is expected to still fail only in `StudioEditor.tsx` (rewired in Task 8).

- [ ] **Step 11: Commit**
```bash
git add -A src/features/customTee/presentation/studio
git commit -m "feat(custom-tee): selection-aware properties panels, text add presets, grouped layers list"
```

---

### Task 8: Studio editor integration

**Files:**
- Modify: `src/features/customTee/presentation/studio/StudioEditor.tsx`

**Interfaces:**
- Consumes: everything from Tasks 5-7.

- [ ] **Step 1: Apply these edits** (read the whole file first; preserve everything not mentioned — upload handling, drop handling, fullscreen, save, views, product panel, buttons):
1. **Imports:** remove `TextPanel` and the old `AlignEdge`-only usage; add `useStudioState`'s `TextInit`-free usage; add `import Canvas, { type CanvasHandle } from './Canvas';`, `TextAddPanel`, `TextInspector`, `ImageInspector`, `SelectionInspector`, `AlignPanel` from their files; `import { isSingleUnit, selectionUnits } from '../../domain/grouping';`; `import type { CanvasPx, Size } from '../../domain/geometry';`.
2. **State:** remove `zoom`/`setZoom` and `selectedSize`/`setSelectedSize` (and the `useEffect(() => setSelectedSize(null), [view?.id])`). Add `const canvasRef = useRef<CanvasHandle>(null); const [zoom, setZoom] = useState(1); const [stagePx, setStagePx] = useState<CanvasPx>({ w: 520, h: 520 }); const [sizes, setSizes] = useState<Record<string, Size>>({});`.
3. **Derived selection info** (after `const studio = useStudioState(...)`):
```tsx
  const selectedText = studio.selected?.type === 'text' ? studio.selected : null;
  const selectedImage = studio.selected?.type === 'image' ? studio.selected : null;
  const units = selectionUnits(studio.layers, studio.selectedIds);
  const singleUnit = isSingleUnit(studio.layers, studio.selectedIds);
  const isGroup = singleUnit && studio.selectedIds.length > 1;
  const selectedLayers = studio.layers.filter((l) => studio.selectedIds.includes(l.id));
  const allOpacity = selectedLayers.length > 0 ? selectedLayers[0].opacity : 1;
```
   (Delete the old `selectedText` line.)
4. **Keyboard handler** (replace the existing `onKey`; keep the `isTyping` guard and the `studioRef` pattern): 
   - `Delete`/`Backspace` with a selection → `s.removeSelected()`.
   - `Cmd/Ctrl+Z` → undo; `+Shift` → redo (unchanged).
   - `Cmd/Ctrl+A` → `e.preventDefault(); s.selectAll()`.
   - `Cmd/Ctrl+G` → `e.preventDefault();` `if (e.shiftKey) s.ungroup(); else s.group();` (match `e.key.toLowerCase() === 'g'`).
   - `Escape` → `s.select([])`.
   - Arrow keys with a selection → `e.preventDefault(); const step = (e.shiftKey ? 10 : 1); const dx = (ArrowLeft ? -step : ArrowRight ? step : 0) / stagePxRef.current.w; const dy = (ArrowUp ? -step : ArrowDown ? step : 0) / stagePxRef.current.h; s.nudge(s.selectedIds, dx, dy);` where `stagePxRef` is a ref mirroring `stagePx` (add `const stagePxRef = useRef(stagePx); stagePxRef.current = stagePx;`).
5. **Layers list** (`layersList` const): new props — `layers`, `selectedIds={studio.selectedIds}`, `onSelect={studio.select}`, `onSetVisible={studio.setVisible}`, `onRemove={studio.removeIds}`, `onMoveUnit={studio.moveUnit}`, `onReorderUnit={studio.reorderUnit}`.
6. **Left panel:** `tool === 'text'` renders `<TextAddPanel onAdd={(init) => studio.addText(init)} />` (it never shows editing fields).
7. **Canvas:** replace the `<div className="overflow-auto py-4"><Canvas ... /></div>` block with:
```tsx
          <Canvas
            ref={canvasRef}
            baseImage={view?.image}
            baseAlt={`${parent.name} ${view?.label ?? ''}`.trim()}
            layers={studio.layers}
            selectedIds={studio.selectedIds}
            onSelect={studio.select}
            onLiveChange={studio.patchManyLive}
            onSettle={studio.settleGesture}
            onCommitText={(id, text) => studio.patch(id, { text, name: text.split('\n')[0].slice(0, 24) })}
            onMeasure={(m) => {
              setStagePx(m.stage);
              setSizes(m.sizes);
            }}
            onZoomChange={setZoom}
          />
```
8. **Toolbar:** pass `zoom={zoom}`, `onZoomIn={() => canvasRef.current?.zoomBy(1.25)}`, `onZoomOut={() => canvasRef.current?.zoomBy(0.8)}`, `onZoomReset={() => canvasRef.current?.setZoom(1)}`, `onFit={() => canvasRef.current?.fit()}` instead of `zoom/onZoom`. When the active view changes, call `canvasRef.current?.fit()` after the image loads (the Canvas already fits on image load, so no extra code is needed).
9. **Right panel:** after `<ProductPanel .../>` and before the Design Layers section, add the Properties section (only when `studio.selectedIds.length > 0`):
```tsx
          {studio.selectedIds.length > 0 && (
            <section aria-label="Properties" className="space-y-5 border-t border-[#EEEEEE] pt-5">
              <h2 className={SECTION_TITLE}>Properties</h2>
              {selectedText && (
                <TextInspector
                  layer={selectedText}
                  onLive={(p) => studio.patchLive(selectedText.id, p)}
                  onCommit={(p) => studio.patch(selectedText.id, p)}
                  onSettle={studio.settleGesture}
                />
              )}
              {selectedImage && (
                <ImageInspector layer={selectedImage} onLive={(p) => studio.patchLive(selectedImage.id, p)} onSettle={studio.settleGesture} />
              )}
              {studio.selectedIds.length > 1 && (
                <SelectionInspector
                  count={studio.selectedIds.length}
                  isGroup={isGroup}
                  canGroup={studio.selectedIds.length > 1}
                  onGroup={studio.group}
                  onUngroup={studio.ungroup}
                  onDelete={studio.removeSelected}
                  opacity={allOpacity}
                  onOpacityLive={(v) => studio.patchManyLive(Object.fromEntries(studio.selectedIds.map((id) => [id, { opacity: v }])))}
                  onSettle={studio.settleGesture}
                />
              )}
              <AlignPanel
                disabled={false}
                canDistribute={units.length >= 3}
                onAlign={(edge) => studio.align(edge, sizes, stagePx)}
                onDistribute={(axis) => studio.distribute(axis, sizes, stagePx)}
              />
              {studio.selected && (
                <PositionScalePanel
                  layer={studio.selected}
                  onFlip={(axis) => studio.flip(studio.selected!.id, axis)}
                  onScaleLive={(scale) => studio.patchLive(studio.selected!.id, { scale })}
                  onSettle={studio.settleGesture}
                />
              )}
            </section>
          )}
```
   and REMOVE the old standalone `<PositionScalePanel ... />` block (now inside Properties). Keep the Design Layers section and the Save area as they are.
10. **Hint:** in the canvas section add a one-line hint under the toolbar: `<p className="text-[10px] text-[#717171]">Wheel to pan · Ctrl/Cmd + wheel to zoom · Space + drag to pan · Shift-click or drag a box to multi-select · Cmd/Ctrl + G to group</p>`.

- [ ] **Step 2: Typecheck and run all tests.** `npx tsc --noEmit && npx vitest run` — expected: clean / all pass. Fix any remaining type mismatches against the interfaces above (do not change the domain modules).

- [ ] **Step 3: Commit**
```bash
git add src/features/customTee/presentation/studio/StudioEditor.tsx
git commit -m "feat(custom-tee): wire multi-select, groups, properties panel and pan/zoom into the studio"
```

---

### Task 9: Browser verification

**Files:** none (verification only; fix defects in the files above).

Use a desktop viewport (e.g. 1440x900) and the live data; generate test PNGs in the page.

- [ ] **Step 1: Left Text tab.** Select a text layer; the left Text tab shows ONLY the three add presets (no editing fields). Add a heading: a new bold text layer appears selected.
- [ ] **Step 2: Right Properties panel.** With a text layer selected: content, font, size, bold, italic, alignment, letter spacing, color, opacity appear in Properties; changing each updates the canvas live; each discrete toggle is one undo step; slider drags are one undo step.
- [ ] **Step 3: On-canvas text edit.** Double-click text: it becomes editable in place; type a new line with Enter; click away commits (layer shows the new text); Escape cancels.
- [ ] **Step 4: Snapping.** Drag a layer near the canvas center and edges: guide lines appear and it snaps; drag near another layer's edge: snaps with a guide; hold Alt: no snapping. Rotate: readout shows the angle, snaps near multiples of 15; Shift forces.
- [ ] **Step 5: Multi-select.** Shift-click a second layer; marquee-drag an empty area to select several; Cmd/Ctrl+A selects all; move them together (with snapping); arrow keys nudge (Shift 10px); Delete removes all.
- [ ] **Step 6: Groups.** With 2+ selected, Group (button and Cmd/Ctrl+G): clicking one member selects the whole group; group handles scale/rotate the whole group (members keep relative placement); double-click a member selects just it; Ungroup (button and Cmd/Ctrl+Shift+G) restores individuals; the layers list shows an expandable group row; reorder moves the whole group; deleting a member of a 2-member group dissolves the group.
- [ ] **Step 7: Align/Distribute.** One layer aligns to the canvas; 2+ layers align to each other; 3+ show Distribute (equal gaps).
- [ ] **Step 8: Pan/zoom.** Wheel pans; Ctrl/Cmd+wheel zooms about the cursor; Space+drag pans; Fit and 100% (click the percent) work; zoom limited to 25%-400%; selection chrome stays a constant on-screen size.
- [ ] **Step 9: Persistence.** Save, reload: groups, opacity and text styles restore; an old-format saved design (no new fields) still loads.
- [ ] **Step 10: Final checks.** `npx tsc --noEmit && npx vitest run`; commit any fixes.
