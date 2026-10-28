import { describe, it, expect } from 'vitest';
import type { ParentProduct, Product } from '@/shared/domain/types';
import { buildParentCard } from './cards';

const parent: ParentProduct = {
  id: 'abc123def',
  name: 'Premium Oversized Tee',
  image: 'p.jpg',
  category: 'T-Shirts',
  subcategory: 'Graphic',
  sizeOrder: ['M'],
  stockBySize: { M: 45 },
};

const product = (over: Partial<Product>): Product => ({
  id: 'x', name: 'x', description: '', price: 1, image: '', category: 'T-Shirts', rating: 5, ...over,
});

describe('buildParentCard', () => {
  it('derives code, stock, parent-only photos and colors from linked products', () => {
    const products = [
      product({ id: '1', parentProductId: 'abc123def', image: 'p.jpg', gallery: ['g1.jpg', ''], variants: [{ id: 'v1', name: 'Forest Green', colorCode: '#0a0' }] }),
      product({ id: '2', parentProductId: 'abc123def', image: 'b.jpg', variants: [{ id: 'v2', name: 'forest green' }, { id: 'v3', name: 'Black' }] }),
      product({ id: '3', parentProductId: 'other', image: 'nope.jpg', variants: [{ id: 'v4', name: 'Red' }] }),
    ];
    const card = buildParentCard(parent, products, 'M');
    expect(card.code).toBe('123DEF');
    expect(card.stock).toBe(45);
    expect(card.photos).toEqual(['p.jpg']);
    expect(card.colors.map((c) => c.name)).toEqual(['Forest Green', 'Black']);
  });
  it('gives distinct codes to parents whose ids share a prefix', () => {
    const a = buildParentCard({ ...parent, id: 'parent-1784992282522' }, [], 'M');
    const b = buildParentCard({ ...parent, id: 'parent-1784992290001' }, [], 'M');
    expect(a.code).toBe('282522');
    expect(b.code).toBe('290001');
    expect(a.code).not.toBe(b.code);
  });
  it('ignores linked product images and galleries for photos', () => {
    const card = buildParentCard(parent, [product({ id: '1', parentProductId: 'abc123def', image: 'x.jpg', gallery: ['y.jpg'] })], 'M');
    expect(card.photos).toEqual(['p.jpg']);
  });
  it('handles a parent with no linked products', () => {
    const card = buildParentCard({ ...parent, image: '' }, [], 'M');
    expect(card.photos).toEqual([]);
    expect(card.colors).toEqual([]);
  });
});
