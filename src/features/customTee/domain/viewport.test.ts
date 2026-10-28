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
