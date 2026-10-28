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
