import { describe, it, expect } from 'vitest';
import { resolveSwipeNavigation } from './swipeThreshold';

describe('resolveSwipeNavigation', () => {
  it('returns null for a small, slow drag', () => {
    expect(resolveSwipeNavigation(10, 5)).toBeNull();
  });

  it('returns 1 (next) for a left drag past the distance threshold', () => {
    expect(resolveSwipeNavigation(-90, 0)).toBe(1);
  });

  it('returns -1 (previous) for a right drag past the distance threshold', () => {
    expect(resolveSwipeNavigation(90, 0)).toBe(-1);
  });

  it('returns 1 (next) for a fast left flick under the distance threshold', () => {
    expect(resolveSwipeNavigation(-20, -600)).toBe(1);
  });

  it('returns -1 (previous) for a fast right flick under the distance threshold', () => {
    expect(resolveSwipeNavigation(20, 600)).toBe(-1);
  });

  it('is exactly-at-threshold inclusive', () => {
    expect(resolveSwipeNavigation(-80, 0)).toBe(1);
    expect(resolveSwipeNavigation(0, -500)).toBe(1);
  });
});
