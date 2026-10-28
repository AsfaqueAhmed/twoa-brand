import { describe, it, expect } from 'vitest';
import { fitWithin } from './imageResize';

describe('fitWithin', () => {
  it('downscales landscape by width', () => {
    expect(fitWithin(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 });
  });
  it('downscales portrait by height', () => {
    expect(fitWithin(1000, 2000, 640)).toEqual({ width: 320, height: 640 });
  });
  it('never upscales', () => {
    expect(fitWithin(300, 200, 480)).toEqual({ width: 300, height: 200 });
  });
  it('keeps exact fit', () => {
    expect(fitWithin(480, 480, 480)).toEqual({ width: 480, height: 480 });
  });
  it('keeps a 1920px-wide banner at 1920 with maxEdge 1920', () => {
    expect(fitWithin(1920, 720, 1920)).toEqual({ width: 1920, height: 720 });
  });
  it('downscales a 3840px banner to 1920 wide', () => {
    expect(fitWithin(3840, 1440, 1920)).toEqual({ width: 1920, height: 720 });
  });
  it('rounds portrait to an integer within the edge', () => {
    const r = fitWithin(1001, 2000, 640);
    expect(r.height).toBe(640);
    expect(Number.isInteger(r.width)).toBe(true);
    expect(r.width).toBeLessThanOrEqual(640);
  });
  it('returns input unchanged for non-positive sizes', () => {
    expect(fitWithin(0, 0, 0)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(-5, -5, -1)).toEqual({ width: -5, height: -5 });
  });
  it('never returns 0', () => {
    expect(fitWithin(10000, 1, 100).height).toBe(1);
  });
});
