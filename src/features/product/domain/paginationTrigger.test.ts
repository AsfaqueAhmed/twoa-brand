import { describe, it, expect } from 'vitest';
import { shouldLoadMore, AUTO_LOAD_LOOKAHEAD } from './paginationTrigger';

describe('shouldLoadMore', () => {
  it('is false when there is no more to load', () => {
    expect(shouldLoadMore(9, 10, false)).toBe(false);
  });

  it('is false when there is no active index', () => {
    expect(shouldLoadMore(-1, 10, true)).toBe(false);
  });

  it('is false while comfortably before the lookahead window', () => {
    expect(shouldLoadMore(5, 10, true)).toBe(false);
  });

  it('is true once within the lookahead window of the end', () => {
    expect(shouldLoadMore(6, 10, true)).toBe(true);
  });

  it('is true at the very last index', () => {
    expect(shouldLoadMore(9, 10, true)).toBe(true);
  });

  it('respects a custom lookahead', () => {
    expect(shouldLoadMore(7, 10, true, 2)).toBe(false);
    expect(shouldLoadMore(8, 10, true, 2)).toBe(true);
  });

  it('exports the default lookahead as 4', () => {
    expect(AUTO_LOAD_LOOKAHEAD).toBe(4);
  });
});
