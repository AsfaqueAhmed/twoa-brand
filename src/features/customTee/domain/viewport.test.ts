import { describe, it, expect } from 'vitest';
import { MIN_ZOOM, MAX_ZOOM, MIN_VISIBLE_FRACTION, clampZoom, zoomAt, panBy, fitViewport, clampPan } from './viewport';

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

describe('clampPan', () => {
  const container = { w: 1000, h: 600 };
  const content = { w: 520, h: 650 };

  it('keeps at least 25% of the stage visible on both axes', () => {
    expect(MIN_VISIBLE_FRACTION).toBe(0.25);
    // zoom 1: stage is 520x650. Max pan keeps 25% of its width/height inside; min pan keeps the last 25% inside.
    const farRightDown = clampPan({ zoom: 1, panX: 5000, panY: 5000 }, container, content);
    expect(farRightDown.panX).toBeCloseTo(1000 - 0.25 * 520);
    expect(farRightDown.panY).toBeCloseTo(600 - 0.25 * 650);
    const farLeftUp = clampPan({ zoom: 1, panX: -5000, panY: -5000 }, container, content);
    expect(farLeftUp.panX).toBeCloseTo(-0.75 * 520);
    expect(farLeftUp.panY).toBeCloseTo(-0.75 * 650);
  });

  it('scales the limit with zoom', () => {
    const r = clampPan({ zoom: 2, panX: 5000, panY: -5000 }, container, content);
    expect(r.panX).toBeCloseTo(1000 - 0.25 * 1040);
    expect(r.panY).toBeCloseTo(-0.75 * 1300);
    expect(r.zoom).toBe(2);
  });

  it('returns the same viewport object when the pan is already allowed', () => {
    const vp = { zoom: 1, panX: 100, panY: 50 };
    expect(clampPan(vp, container, content)).toBe(vp);
  });

  it('accepts a custom visible fraction', () => {
    const r = clampPan({ zoom: 1, panX: 5000, panY: 0 }, container, content, 0.5);
    expect(r.panX).toBeCloseTo(1000 - 0.5 * 520);
  });
});
