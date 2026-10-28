import { describe, it, expect } from 'vitest';
import { createImageLayer, MIN_SCALE, type Layer } from './layers';
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
  limitMoveDelta,
  limitScaleFactor,
  rotationFits,
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

describe('group limits', () => {
  const group = [L('a', 0.2, 0.5), L('b', 0.6, 0.5)];

  it('limitMoveDelta shrinks the shared delta so every center stays inside', () => {
    const r = limitMoveDelta(group, ['a', 'b'], 0.9, 0);
    expect(r.dx).toBeCloseTo(0.4);
    expect(r.dy).toBe(0);
    expect(limitMoveDelta(group, ['a', 'b'], -0.5, 0.2)).toEqual({ dx: -0.2, dy: 0.2 });
  });

  it('moveLayersBy keeps members spaced at the edge', () => {
    const out = moveLayersBy(group, ['a', 'b'], 0.9, 0);
    expect(byId(out, 'b').x).toBeCloseTo(1);
    expect(byId(out, 'b').x - byId(out, 'a').x).toBeCloseTo(0.4);
  });

  it('limitScaleFactor respects scale bounds and canvas edges', () => {
    const ls = [L('a', 0.4, 0.5, { scale: 0.4 }), L('b', 0.6, 0.5, { scale: 0.4 })];
    expect(limitScaleFactor(ls, ['a', 'b'], 10, { x: 0.5, y: 0.5 })).toBeCloseTo(3.75);
    expect(limitScaleFactor(ls, ['a', 'b'], 0.0001, { x: 0.5, y: 0.5 })).toBeCloseTo(MIN_SCALE / 0.4);
    expect(limitScaleFactor(ls, ['a', 'b'], 1.2, { x: 0.5, y: 0.5 })).toBe(1.2);
    const wide = [L('a', 0.1, 0.5, { scale: 0.1 }), L('b', 0.9, 0.5, { scale: 0.1 })];
    expect(limitScaleFactor(wide, ['a', 'b'], 3, { x: 0.5, y: 0.5 })).toBeCloseTo(1.25);
  });

  it('rotationFits is false when a rotated center would leave the canvas', () => {
    const ls = [L('a', 0.1, 0.5), L('b', 0.9, 0.5)];
    expect(rotationFits(ls, ['a', 'b'], 180, { x: 0.5, y: 0.5 }, canvas)).toBe(true);
    expect(rotationFits(ls, ['a', 'b'], 45, { x: 0.5, y: 0.5 }, canvas)).toBe(true);
    const corner = [L('a', 0.05, 0.05), L('b', 0.95, 0.95)];
    expect(rotationFits(corner, ['a', 'b'], 45, { x: 0.5, y: 0.5 }, canvas)).toBe(false);
  });
});
