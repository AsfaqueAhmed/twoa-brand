import { describe, it, expect } from 'vitest';
import { getRelatedProducts } from './related';
import type { Product } from '@/shared/domain/types';

const p = (id: string): Product => ({ id, name: id, description: '', price: 1, image: '', category: 'T-Shirts', rating: 5 });

describe('getRelatedProducts', () => {
  const list = ['a', 'b', 'c', 'd', 'e'].map(p);

  it('excludes the current product and keeps order', () => {
    expect(getRelatedProducts(list, 'b', 10).map((x) => x.id)).toEqual(['a', 'c', 'd', 'e']);
  });

  it('truncates to the limit', () => {
    expect(getRelatedProducts(list, 'a', 3).map((x) => x.id)).toEqual(['b', 'c', 'd']);
  });

  it('returns fewer than the limit when candidates run out', () => {
    expect(getRelatedProducts([p('a'), p('b')], 'a', 4).map((x) => x.id)).toEqual(['b']);
  });

  it('returns [] for empty input, a zero limit, or when only the current product exists', () => {
    expect(getRelatedProducts([], 'a', 4)).toEqual([]);
    expect(getRelatedProducts(list, 'a', 0)).toEqual([]);
    expect(getRelatedProducts([p('a')], 'a', 4)).toEqual([]);
  });
});
