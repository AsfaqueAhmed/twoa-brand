import { describe, it, expect } from 'vitest';
import { fitWithin } from './imageResize';

describe('fitWithin', () => {
  it('downscales landscape by width', () => {
    expect(fitWithin(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 });
  });
  it('downscales portrait by height', () => {
    expect(fitWithin(1000, 2000, 480)).toEqual({ width: 240, height: 480 });
  });
  it('never upscales', () => {
    expect(fitWithin(300, 200, 480)).toEqual({ width: 300, height: 200 });
  });
  it('keeps exact fit', () => {
    expect(fitWithin(480, 480, 480)).toEqual({ width: 480, height: 480 });
  });
  it('never returns 0', () => {
    expect(fitWithin(10000, 1, 100).height).toBe(1);
  });
});
