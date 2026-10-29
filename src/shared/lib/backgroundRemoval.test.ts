import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TOLERANCE,
  MAX_TOLERANCE,
  MIN_TOLERANCE,
  clampTolerance,
  colorDistance,
  estimateBackgroundColor,
  removeSolidBackground,
} from './backgroundRemoval';

type RGBA = [number, number, number, number];
const WHITE: RGBA = [255, 255, 255, 255];
const RED: RGBA = [220, 20, 20, 255];

function image(w: number, h: number, fill: RGBA): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) d.set(fill, i * 4);
  return d;
}
function rect(d: Uint8ClampedArray, w: number, x0: number, y0: number, x1: number, y1: number, c: RGBA) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) d.set(c, (y * w + x) * 4);
}
const alphaAt = (d: Uint8ClampedArray, w: number, x: number, y: number) => d[(y * w + x) * 4 + 3];
const pxAt = (d: Uint8ClampedArray, w: number, x: number, y: number) => Array.from(d.slice((y * w + x) * 4, (y * w + x) * 4 + 4));

describe('colorDistance', () => {
  it('is 0 for equal colours and 255 for black vs white', () => {
    expect(colorDistance(10, 20, 30, 10, 20, 30)).toBe(0);
    expect(colorDistance(0, 0, 0, 255, 255, 255)).toBeCloseTo(255, 5);
  });
});

describe('clampTolerance', () => {
  it('keeps the value inside the slider range', () => {
    expect(clampTolerance(1)).toBe(MIN_TOLERANCE);
    expect(clampTolerance(500)).toBe(MAX_TOLERANCE);
    expect(clampTolerance(42)).toBe(42);
    expect(clampTolerance(Number.NaN)).toBe(DEFAULT_TOLERANCE);
  });
});

describe('estimateBackgroundColor', () => {
  it('uses the median of the border pixels, ignoring a few odd ones', () => {
    const w = 10;
    const h = 10;
    const d = image(w, h, WHITE);
    rect(d, w, 0, 0, 2, 1, [0, 0, 0, 255]); // two dark pixels on the border
    expect(estimateBackgroundColor(d, w, h)).toEqual([255, 255, 255]);
  });

  it('returns null when the border is already transparent', () => {
    const d = image(6, 6, [255, 255, 255, 0]);
    expect(estimateBackgroundColor(d, 6, 6)).toBeNull();
  });
});

describe('removeSolidBackground', () => {
  it('makes a solid white background transparent and keeps a red square opaque', () => {
    const w = 20;
    const h = 20;
    const d = image(w, h, WHITE);
    rect(d, w, 5, 5, 15, 15, RED);
    const { data, changed } = removeSolidBackground(d, w, h);
    expect(changed).toBe(true);
    expect(alphaAt(data, w, 0, 0)).toBe(0);
    expect(alphaAt(data, w, 19, 19)).toBe(0);
    expect(alphaAt(data, w, 3, 10)).toBe(0);
    for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) expect(pxAt(data, w, x, y)).toEqual(RED);
  });

  it('does not mutate the input', () => {
    const d = image(8, 8, WHITE);
    const copy = d.slice();
    removeSolidBackground(d, 8, 8);
    expect(d).toEqual(copy);
  });

  it('preserves an enclosed area of background colour inside the artwork', () => {
    const w = 30;
    const h = 30;
    const d = image(w, h, WHITE);
    rect(d, w, 5, 5, 25, 25, RED);
    rect(d, w, 12, 12, 18, 18, WHITE); // white hole fully enclosed by red
    const { data } = removeSolidBackground(d, w, h);
    expect(alphaAt(data, w, 0, 0)).toBe(0);
    expect(alphaAt(data, w, 15, 15)).toBe(255);
    expect(alphaAt(data, w, 12, 12)).toBe(255);
  });

  it('removes near-background pixels only when the tolerance allows it', () => {
    const w = 20;
    const h = 20;
    const d = image(w, h, WHITE);
    // A light grey band connected to the border, ~40 away from white.
    const GREY: RGBA = [215, 215, 215, 255];
    rect(d, w, 0, 8, 20, 12, GREY);
    rect(d, w, 8, 2, 12, 6, RED);

    const strict = removeSolidBackground(d, w, h, { tolerance: 10 }).data;
    expect(alphaAt(strict, w, 0, 0)).toBe(0);
    expect(alphaAt(strict, w, 10, 10)).toBe(255); // grey band kept

    const loose = removeSolidBackground(d, w, h, { tolerance: 60 }).data;
    expect(alphaAt(loose, w, 10, 10)).toBe(0); // grey band removed
    expect(alphaAt(loose, w, 10, 4)).toBe(255); // red kept
  });

  it('feathers anti-aliased edge pixels instead of leaving a hard fringe', () => {
    const w = 20;
    const h = 20;
    const d = image(w, h, WHITE);
    rect(d, w, 5, 5, 15, 15, RED);
    // A soft edge column halfway between white and red-ish: just outside the tolerance.
    const SOFT: RGBA = [255, 220, 220, 255];
    rect(d, w, 4, 5, 5, 15, SOFT);
    const dist = colorDistance(255, 220, 220, 255, 255, 255);
    const { data } = removeSolidBackground(d, w, h, { tolerance: Math.floor(dist) - 2 });
    const a = alphaAt(data, w, 4, 10);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(255);
    expect(alphaAt(data, w, 5, 10)).toBe(255);
  });

  it('leaves an image whose background is already transparent untouched', () => {
    const w = 12;
    const h = 12;
    const d = image(w, h, [0, 0, 0, 0]);
    rect(d, w, 3, 3, 9, 9, RED);
    const { data, changed } = removeSolidBackground(d, w, h);
    expect(changed).toBe(false);
    expect(data).toEqual(d);
  });

  it('works on a non-white background colour', () => {
    const w = 16;
    const h = 16;
    const GREEN: RGBA = [30, 180, 60, 255];
    const d = image(w, h, GREEN);
    rect(d, w, 4, 4, 12, 12, [250, 250, 250, 255]);
    const { data } = removeSolidBackground(d, w, h);
    expect(alphaAt(data, w, 0, 0)).toBe(0);
    expect(alphaAt(data, w, 8, 8)).toBe(255);
  });
});

describe('removeSolidBackground includeEnclosed', () => {
  // 12x12 white image with a red ring (outer 3..8) that encloses a white 2x2 hole at the centre.
  const make = () => {
    const w = 12;
    const d = new Uint8ClampedArray(w * w * 4).fill(255);
    for (let y = 3; y < 9; y++) {
      for (let x = 3; x < 9; x++) {
        const hole = x >= 5 && x <= 6 && y >= 5 && y <= 6;
        if (hole) continue;
        const o = (y * w + x) * 4;
        d[o] = 220;
        d[o + 1] = 40;
        d[o + 2] = 40;
      }
    }
    return { d, w };
  };
  const alphaAt = (data: Uint8ClampedArray, w: number, x: number, y: number) => data[(y * w + x) * 4 + 3];

  it('keeps an enclosed hole by default', () => {
    const { d, w } = make();
    const { data } = removeSolidBackground(d, w, w);
    expect(alphaAt(data, w, 0, 0)).toBe(0);
    expect(alphaAt(data, w, 5, 5)).toBe(255);
  });

  it('removes the enclosed hole too when includeEnclosed is set, and keeps the ring', () => {
    const { d, w } = make();
    const { data, changed } = removeSolidBackground(d, w, w, { includeEnclosed: true });
    expect(changed).toBe(true);
    expect(alphaAt(data, w, 0, 0)).toBe(0);
    expect(alphaAt(data, w, 5, 5)).toBe(0);
    expect(alphaAt(data, w, 3, 3)).toBe(255);
  });
});
