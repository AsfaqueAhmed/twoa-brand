import { describe, it, expect } from 'vitest';
import type { ParentProduct } from '@/shared/domain/types';
import {
  DEFAULT_PARENT_FILTERS,
  activeParentFilterCount,
  filterParents,
  linkedProductCounts,
  parentCategoryFilterOptions,
  parentStats,
  parentTotalStock,
  sortParents,
} from './parentList';

const pp = (id: string, name: string, stock: Record<string, number>, category = ''): ParentProduct => ({
  id,
  name,
  image: '',
  category,
  sizeOrder: Object.keys(stock),
  stockBySize: stock,
});

const A = pp('p-a', 'Linen Shirt', { S: 5, M: 10 }, 'Men'); // 15 in
const B = pp('p-b', 'Denim Jacket', { S: 3, M: 4 }, 'Women'); // 7 low
const C = pp('p-c', 'Cotton Tee', { S: 0, M: 0 }); // 0 out
const D = pp('p-d', 'Wool Coat', {}); // 0 out

describe('parentTotalStock', () => {
  it('sums sizes in sizeOrder', () => expect(parentTotalStock(A)).toBe(15));
  it('ignores stock keys not in sizeOrder', () =>
    expect(parentTotalStock({ ...A, sizeOrder: ['S'] })).toBe(5));
  it('is 0 for no sizes or missing stock', () => {
    expect(parentTotalStock(D)).toBe(0);
    expect(parentTotalStock({ ...A, stockBySize: {} })).toBe(0);
  });
});

describe('linkedProductCounts', () => {
  it('counts per parent, skipping unlinked', () => {
    const m = linkedProductCounts([{ parentProductId: 'x' }, { parentProductId: 'x' }, { parentProductId: 'y' }, {}]);
    expect(m.get('x')).toBe(2);
    expect(m.get('y')).toBe(1);
    expect(m.size).toBe(2);
  });
  it('empty input gives empty map', () => expect(linkedProductCounts([]).size).toBe(0));
});

describe('filterParents', () => {
  const all = [A, B, C, D];
  it('default returns everything', () => expect(filterParents(all, DEFAULT_PARENT_FILTERS)).toHaveLength(4));
  it('searches name case-insensitively and trims', () =>
    expect(filterParents(all, { ...DEFAULT_PARENT_FILTERS, search: '  DENIM ' })).toEqual([B]));
  it('searches id', () => expect(filterParents(all, { ...DEFAULT_PARENT_FILTERS, search: 'P-C' })).toEqual([C]));
  it('filters by stock level', () => {
    expect(filterParents(all, { ...DEFAULT_PARENT_FILTERS, stock: 'in' })).toEqual([A]);
    expect(filterParents(all, { ...DEFAULT_PARENT_FILTERS, stock: 'low' })).toEqual([B]);
    expect(filterParents(all, { ...DEFAULT_PARENT_FILTERS, stock: 'out' })).toEqual([C, D]);
  });
  it('combines search and stock', () =>
    expect(filterParents(all, { ...DEFAULT_PARENT_FILTERS, search: 'co', stock: 'out' })).toEqual([C, D]));
  it('handles empty list', () => expect(filterParents([], DEFAULT_PARENT_FILTERS)).toEqual([]));
  it('filters by category, treating blank as Uncategorized', () => {
    expect(filterParents(all, { ...DEFAULT_PARENT_FILTERS, category: 'Men' })).toEqual([A]);
    expect(filterParents(all, { ...DEFAULT_PARENT_FILTERS, category: 'Uncategorized' })).toEqual([C, D]);
  });
});

describe('parentCategoryFilterOptions', () => {
  it('lists distinct sorted categories with Uncategorized last', () => {
    expect(parentCategoryFilterOptions([C, B, A, D])).toEqual(['Men', 'Women', 'Uncategorized']);
    expect(parentCategoryFilterOptions([A])).toEqual(['Men']);
    expect(parentCategoryFilterOptions([])).toEqual([]);
  });
});

describe('sortParents', () => {
  const linked = new Map([['p-a', 1], ['p-b', 5], ['p-c', 5]]);
  it("'' keeps order and returns a new array", () => {
    const input = [B, A];
    const out = sortParents(input, '', linked);
    expect(out).toEqual([B, A]);
    expect(out).not.toBe(input);
  });
  it('sorts by name', () => expect(sortParents([A, B, C, D], 'name', linked)).toEqual([C, B, A, D]));
  it('sorts stock asc / desc', () => {
    expect(sortParents([A, B, C], 'stock_asc', linked)).toEqual([C, B, A]);
    expect(sortParents([C, B, A], 'stock_desc', linked)).toEqual([A, B, C]);
  });
  it('sorts by linked desc, stable on ties, missing = 0', () => {
    expect(sortParents([A, B, C, D], 'linked_desc', linked)).toEqual([B, C, A, D]);
    expect(sortParents([C, B], 'linked_desc', linked)).toEqual([C, B]);
  });
  it('does not mutate input', () => {
    const input = [A, B, C];
    sortParents(input, 'stock_asc', linked);
    expect(input).toEqual([A, B, C]);
  });
});

describe('parentStats', () => {
  it('computes totals and rounded percents', () => {
    expect(parentStats([A, B, C])).toEqual({ total: 3, totalStock: 22, low: 1, out: 1, lowPct: 33, outPct: 33 });
  });
  it('is all zero for empty list', () =>
    expect(parentStats([])).toEqual({ total: 0, totalStock: 0, low: 0, out: 0, lowPct: 0, outPct: 0 }));
});

describe('activeParentFilterCount', () => {
  it('is 0 by default', () => expect(activeParentFilterCount(DEFAULT_PARENT_FILTERS, '')).toBe(0));
  it('counts search, stock, category and sort; ignores whitespace search', () => {
    expect(activeParentFilterCount({ search: 'a', stock: 'low', category: 'Men' }, 'name')).toBe(4);
    expect(activeParentFilterCount({ search: '  ', stock: '', category: '' }, '')).toBe(0);
  });
});
