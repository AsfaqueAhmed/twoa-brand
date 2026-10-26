import { describe, it, expect } from 'vitest';
import { getInStockSizes, getDefaultSize } from './sizes';
import type { Product } from '@/shared/domain/types';

const base: Product = { id: '1', name: 'Tee', description: '', price: 10, image: '', category: 'T-Shirts', rating: 5 };

const withStock = (stockBySize: Record<string, number>): Product => ({
  ...base,
  parentProduct: { id: 'p', name: 'Tee', sizeOrder: Object.keys(stockBySize), stockBySize },
});

describe('catalog size helpers', () => {
  it('returns in-stock sizes in canonical order', () => {
    expect(getInStockSizes(withStock({ S: 0, M: 3, L: 1, XL: 0 }))).toEqual(['M', 'L']);
  });

  it('returns [] when there is no parent product', () => {
    expect(getInStockSizes(base)).toEqual([]);
  });

  it('default size is the first in-stock size', () => {
    expect(getDefaultSize(withStock({ S: 0, M: 3, L: 1 }))).toBe('M');
  });

  it('default size is undefined when nothing is in stock or no parent product', () => {
    expect(getDefaultSize(withStock({ S: 0, M: 0 }))).toBeUndefined();
    expect(getDefaultSize(base)).toBeUndefined();
  });
});
