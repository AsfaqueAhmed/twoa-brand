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
  TEXT_PRESETS,
  MAX_TEXT_LENGTH,
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
  it('updateLayer returns the same array when nothing changes; removeLayer likewise for unknown ids', () => {
    expect(updateLayer(base, 'a', { x: base[0].x })).toBe(base);
    expect(updateLayer(base, 'a', {})).toBe(base);
    expect(updateLayer(base, 'nope', { x: 0.1 })).toBe(base);
    expect(updateLayer(base, 'a', { x: 0.1 })).not.toBe(base);
    expect(removeLayer(base, 'nope')).toBe(base);
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
