import { describe, it, expect } from 'vitest';
import type { Product } from '@/shared/domain/types';
import {
  LOW_STOCK_THRESHOLD,
  DEFAULT_FILTERS,
  productTotalStock,
  stockLevel,
  productStatus,
  filterProducts,
  sortProducts,
  paginate,
  productStats,
  activeFilterCount,
  nextStock,
  stockBarPercent,
  distinctParentIds,
  attachParentProducts,
  validateStockAmount,
  type ProductFilters,
} from './productList';
import { pruneSelection } from '@/features/admin/orders/domain/orderView';
import type { ParentProduct } from '@/shared/domain/types';

function mk(id: string, over: Partial<Product> = {}, stock?: Record<string, number> | null): Product {
  const stockBySize = stock === undefined ? { S: 5, M: 5 } : stock;
  return {
    id,
    name: `Product ${id}`,
    description: '',
    price: 100,
    image: '',
    category: 'Shirts',
    subcategory: 'Casual',
    rating: 5,
    parentProduct:
      stockBySize === null
        ? undefined
        : { id: `pp-${id}`, name: 'PP', sizeOrder: Object.keys(stockBySize), stockBySize },
    ...over,
  };
}

const f = (o: Partial<ProductFilters>): ProductFilters => ({ ...DEFAULT_FILTERS, ...o });

describe('productTotalStock', () => {
  it('sums stock across sizes', () => {
    expect(productTotalStock(mk('a', {}, { S: 3, M: 4, L: 0 }))).toBe(7);
  });
  it('returns null without a parent product', () => {
    expect(productTotalStock(mk('a', {}, null))).toBeNull();
  });
});

describe('stockLevel', () => {
  it('maps boundaries', () => {
    expect(LOW_STOCK_THRESHOLD).toBe(10);
    expect(stockLevel(null)).toBe('out');
    expect(stockLevel(0)).toBe('out');
    expect(stockLevel(1)).toBe('low');
    expect(stockLevel(10)).toBe('low');
    expect(stockLevel(11)).toBe('in');
  });
});

describe('productStatus', () => {
  it('uses stock level when active', () => {
    expect(productStatus(mk('a', {}, { S: 50 }))).toBe('active');
    expect(productStatus(mk('a', {}, { S: 5 }))).toBe('low');
    expect(productStatus(mk('a', {}, { S: 0 }))).toBe('out');
  });
  it('inactive takes precedence', () => {
    expect(productStatus(mk('a', { isActive: false }, { S: 0 }))).toBe('inactive');
    expect(productStatus(mk('a', { isActive: false }, { S: 50 }))).toBe('inactive');
  });
  it('treats undefined isActive as active', () => {
    expect(productStatus(mk('a', { isActive: undefined }, { S: 50 }))).toBe('active');
  });
});

describe('filterProducts', () => {
  const items = [
    mk('p1', { name: 'Blue Tee', category: 'Shirts', subcategory: 'Casual' }, { S: 50 }),
    mk('p2', { name: 'Red Dress', category: 'Dresses', subcategory: 'Party', isActive: false }, { S: 5 }),
    mk('p3', { name: 'Green Hat', category: 'Hats', subcategory: '' }, { S: 0 }),
  ];
  it('returns all by default', () => {
    expect(filterProducts(items, DEFAULT_FILTERS)).toHaveLength(3);
  });
  it('searches name, category, subcategory and id case-insensitively', () => {
    expect(filterProducts(items, f({ search: 'blue' })).map((p) => p.id)).toEqual(['p1']);
    expect(filterProducts(items, f({ search: 'DRESSES' })).map((p) => p.id)).toEqual(['p2']);
    expect(filterProducts(items, f({ search: 'party' })).map((p) => p.id)).toEqual(['p2']);
    expect(filterProducts(items, f({ search: 'P3' })).map((p) => p.id)).toEqual(['p3']);
  });
  it('filters by category', () => {
    expect(filterProducts(items, f({ category: 'Hats' })).map((p) => p.id)).toEqual(['p3']);
  });
  it('filters by status', () => {
    expect(filterProducts(items, f({ status: 'active' })).map((p) => p.id)).toEqual(['p1', 'p3']);
    expect(filterProducts(items, f({ status: 'inactive' })).map((p) => p.id)).toEqual(['p2']);
  });
  it('filters by stock level', () => {
    expect(filterProducts(items, f({ stock: 'in' })).map((p) => p.id)).toEqual(['p1']);
    expect(filterProducts(items, f({ stock: 'low' })).map((p) => p.id)).toEqual(['p2']);
    expect(filterProducts(items, f({ stock: 'out' })).map((p) => p.id)).toEqual(['p3']);
  });
  it('treats null stock (no parent) as out of stock', () => {
    const noParent = [mk('n1', {}, null), mk('n2', {}, { S: 50 })];
    expect(filterProducts(noParent, f({ stock: 'out' })).map((p) => p.id)).toEqual(['n1']);
    expect(filterProducts(noParent, f({ stock: 'in' })).map((p) => p.id)).toEqual(['n2']);
    expect(filterProducts(noParent, f({ stock: 'low' }))).toEqual([]);
  });
  it('combines filters', () => {
    expect(filterProducts(items, f({ status: 'active', stock: 'out' })).map((p) => p.id)).toEqual(['p3']);
    expect(filterProducts(items, f({ status: 'inactive', stock: 'out' }))).toEqual([]);
  });
});

describe('sortProducts', () => {
  const a = mk('a', { name: 'banana', price: 30 }, { S: 5 });
  const b = mk('b', { name: 'Apple', price: 10 }, null);
  const c = mk('c', { name: 'cherry', price: 20 }, { S: 20 });
  const items = [a, b, c];
  it("keeps order for '' and does not mutate", () => {
    const out = sortProducts(items, '');
    expect(out.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(out).not.toBe(items);
  });
  it('sorts by name case-insensitively', () => {
    expect(sortProducts(items, 'name').map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });
  it('sorts by price', () => {
    expect(sortProducts(items, 'price_asc').map((p) => p.id)).toEqual(['b', 'c', 'a']);
    expect(sortProducts(items, 'price_desc').map((p) => p.id)).toEqual(['a', 'c', 'b']);
  });
  it("keeps stable order for ties and for '' on a fresh copy", () => {
    const t1 = mk('t1', { price: 5 }), t2 = mk('t2', { price: 5 }), t3 = mk('t3', { price: 5 });
    expect(sortProducts([t2, t1, t3], 'price_asc').map((p) => p.id)).toEqual(['t2', 't1', 't3']);
    expect(sortProducts([t3, t1, t2], '').map((p) => p.id)).toEqual(['t3', 't1', 't2']);
  });
  it('sorts by stock with null as 0', () => {
    expect(sortProducts(items, 'stock_asc').map((p) => p.id)).toEqual(['b', 'a', 'c']);
    expect(sortProducts(items, 'stock_desc').map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);
  it('returns a middle page', () => {
    expect(paginate(items, 2, 10)).toEqual({ items: items.slice(10, 20), page: 2, totalPages: 3, from: 11, to: 20, total: 25 });
  });
  it('returns a partial last page', () => {
    expect(paginate(items, 3, 10)).toMatchObject({ items: [21, 22, 23, 24, 25], from: 21, to: 25 });
  });
  it('clamps out-of-range pages', () => {
    expect(paginate(items, 99, 10).page).toBe(3);
    expect(paginate(items, 0, 10).page).toBe(1);
  });
  it('handles an empty list', () => {
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, totalPages: 1, from: 0, to: 0, total: 0 });
  });
});

describe('productStats', () => {
  it('counts and rounds percentages', () => {
    const items = [
      mk('a', {}, { S: 50 }),
      mk('b', {}, { S: 5 }),
      mk('c', { isActive: false }, { S: 0 }),
    ];
    expect(productStats(items)).toEqual({ total: 3, active: 2, out: 1, low: 1, activePct: 67, outPct: 33, lowPct: 33 });
  });
  it('is zero for an empty list', () => {
    expect(productStats([])).toEqual({ total: 0, active: 0, out: 0, low: 0, activePct: 0, outPct: 0, lowPct: 0 });
  });
});

describe('activeFilterCount', () => {
  it('counts non-empty filters and sort', () => {
    expect(activeFilterCount(DEFAULT_FILTERS, '')).toBe(0);
    expect(activeFilterCount(f({ search: 'x', category: 'Hats', status: 'active', stock: 'low' }), 'name')).toBe(5);
    expect(activeFilterCount(f({ category: 'Hats' }), '')).toBe(1);
  });
});

describe('nextStock', () => {
  it('sets, adds and removes', () => {
    expect(nextStock(5, 'set', 12)).toBe(12);
    expect(nextStock(5, 'add', 3)).toBe(8);
    expect(nextStock(5, 'remove', 3)).toBe(2);
  });
  it('floors at 0 when removing', () => {
    expect(nextStock(5, 'remove', 9)).toBe(0);
    expect(nextStock(0, 'remove', 1)).toBe(0);
  });
  it('handles zero amounts', () => {
    expect(nextStock(5, 'set', 0)).toBe(0);
    expect(nextStock(5, 'add', 0)).toBe(5);
    expect(nextStock(5, 'remove', 0)).toBe(5);
  });
});

describe('stockBarPercent', () => {
  it('computes bar width relative to the max', () => {
    expect(stockBarPercent(null)).toBe(0);
    expect(stockBarPercent(0)).toBe(0);
    expect(stockBarPercent(30)).toBe(50);
    expect(stockBarPercent(500)).toBe(100);
  });
});

describe('distinctParentIds', () => {
  const lite = (id: string, parentProductId?: string) => mk(id, { parentProductId }, null);
  it('collects distinct parent ids and counts parentless products', () => {
    const res = distinctParentIds([lite('a', 'p1'), lite('b', 'p1'), lite('c'), lite('d', 'p2')], ['a', 'b', 'c']);
    expect(res.parentIds).toEqual(['p1']);
    expect(res.skipped).toBe(1);
  });
});

describe('attachParentProducts', () => {
  const parent = (id: string): ParentProduct => ({ id, name: id, sizeOrder: ['S'], stockBySize: { S: 4 } });
  it('attaches the matching parent and leaves others undefined', () => {
    const items = [mk('a', { parentProductId: 'p1' }, null), mk('b', {}, null), mk('c', { parentProductId: 'missing' }, null)];
    const out = attachParentProducts(items, [parent('p1')]);
    expect(out[0].parentProduct?.id).toBe('p1');
    expect(out[1].parentProduct).toBeUndefined();
    expect(out[2].parentProduct).toBeUndefined();
    expect(productTotalStock(out[0])).toBe(4);
  });
  it('does not mutate inputs and replaces stale parents', () => {
    const items = [mk('a', { parentProductId: 'p1' }, { S: 99 })];
    const out = attachParentProducts(items, [parent('p1')]);
    expect(out[0]).not.toBe(items[0]);
    expect(items[0].parentProduct?.stockBySize.S).toBe(99);
    expect(out[0].parentProduct?.stockBySize.S).toBe(4);
  });
});

describe('selection pruning against the filtered list', () => {
  it('drops selected ids hidden by the current filters', () => {
    const items = [mk('p1', { category: 'Hats' }), mk('p2', { category: 'Shirts' }), mk('p3', { category: 'Hats' })];
    const visible = filterProducts(items, f({ category: 'Hats' })).map((p) => p.id);
    expect(pruneSelection(['p1', 'p2', 'p3'], visible)).toEqual(['p1', 'p3']);
  });
  it('keeps the same array when nothing is hidden', () => {
    const sel = ['p1'];
    expect(pruneSelection(sel, ['p1', 'p2'])).toBe(sel);
  });
});

describe('validateStockAmount', () => {
  it('accepts whole numbers of 0 or more', () => {
    expect(validateStockAmount(0)).toBeNull();
    expect(validateStockAmount(12)).toBeNull();
  });
  it('rejects negatives, fractions and non-finite values', () => {
    for (const bad of [-1, 1.5, NaN, Infinity]) expect(validateStockAmount(bad)).toMatch(/whole number/);
  });
});
