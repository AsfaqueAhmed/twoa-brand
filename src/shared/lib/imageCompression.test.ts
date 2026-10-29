import { describe, expect, it } from 'vitest';
import { compressionAttempts, fitWithin, withExtension } from './imageCompression';

describe('fitWithin', () => {
  it('keeps small images and scales large ones to the longest edge', () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(4000, 2000, 2000)).toEqual({ width: 2000, height: 1000 });
    expect(fitWithin(1000, 3000, 1500)).toEqual({ width: 500, height: 1500 });
  });
});

describe('compressionAttempts', () => {
  it('starts at the full edge with the best quality and ends at the smallest edge with the worst', () => {
    const list = compressionAttempts(1600);
    expect(list[0]).toEqual({ edge: 1600, quality: 0.9 });
    expect(list[list.length - 1].quality).toBe(0.5);
    expect(list[list.length - 1].edge).toBeGreaterThanOrEqual(640 * 0.8);
  });
  it('lowers quality before the edge and never repeats an attempt', () => {
    const list = compressionAttempts(2000);
    expect(list.slice(0, 5).map((a) => a.edge)).toEqual([2000, 2000, 2000, 2000, 2000]);
    expect(list[5].edge).toBe(1600);
    expect(new Set(list.map((a) => `${a.edge}-${a.quality}`)).size).toBe(list.length);
  });
  it('handles a max edge already below the minimum', () => {
    expect(compressionAttempts(400).every((a) => a.edge === 400)).toBe(true);
  });
});

describe('withExtension', () => {
  it('swaps the extension for the output mime type', () => {
    expect(withExtension('photo.final.png', 'image/webp')).toBe('photo.final.webp');
    expect(withExtension('', 'image/jpeg')).toBe('image.jpg');
  });
});
