import { describe, it, expect } from 'vitest';
import type { ParentProduct } from '@/shared/domain/types';
import { parseHandoff, handoffFromParams, resolveStudioTarget } from './studioTarget';

const parent = (id: string, image: string, stock: Record<string, number>): ParentProduct => ({
  id, name: id, image, category: 'T-Shirt', subcategory: 'Adult', sizeOrder: Object.keys(stock), stockBySize: stock,
});

describe('handoff parsing', () => {
  it('parses stored JSON and rejects junk', () => {
    expect(parseHandoff('{"parentProductId":"a","size":"M"}')).toEqual({ parentProductId: 'a', size: 'M' });
    expect(parseHandoff(null)).toBeNull();
    expect(parseHandoff('{bad')).toBeNull();
    expect(parseHandoff('{"size":"M"}')).toBeNull();
  });
  it('builds from query params', () => {
    expect(handoffFromParams('a', 'M')).toEqual({ parentProductId: 'a', size: 'M' });
    expect(handoffFromParams(null, 'M')).toBeNull();
    expect(handoffFromParams('a', '')).toBeNull();
  });
});

describe('resolveStudioTarget', () => {
  const parents = [parent('a', 'a.jpg', { M: 3, L: 0 }), parent('b', '', { M: 5 })];
  it('returns the imaged parent that has stock in the size', () => {
    expect(resolveStudioTarget(parents, { parentProductId: 'a', size: 'M' })?.id).toBe('a');
  });
  it('returns null when stock is 0, the parent has no image, is missing, or there is no hand-off', () => {
    expect(resolveStudioTarget(parents, { parentProductId: 'a', size: 'L' })).toBeNull();
    expect(resolveStudioTarget(parents, { parentProductId: 'b', size: 'M' })).toBeNull();
    expect(resolveStudioTarget(parents, { parentProductId: 'zzz', size: 'M' })).toBeNull();
    expect(resolveStudioTarget(parents, null)).toBeNull();
  });
});
