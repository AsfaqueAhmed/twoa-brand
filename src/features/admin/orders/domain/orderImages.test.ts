import { describe, it, expect } from 'vitest';
import type { Order, Product } from '@/shared/domain/types';
import { buildOrderImages, itemThumbnails, pruneSelection } from './orderImages';

const order = {
  items: [
    { productId: 'p1', name: 'A', image: 'a.jpg', price: 1, quantity: 1 },
    { productId: 'p2', name: 'B', image: '', price: 1, quantity: 1 },
    { productId: 'p1', name: 'A2', image: 'a.jpg', price: 1, quantity: 1 },
  ],
} as unknown as Order;
const products = new Map([
  ['p1', { gallery: ['a.jpg', 'a2.jpg', 'a3.jpg', 'a4.jpg'] }],
  ['p2', { gallery: ['b1.jpg'] }],
]) as unknown as Map<string, Product>;

describe('orderImages', () => {
  it('dedupes by src and skips empty', () => {
    expect(buildOrderImages(order, products).map((i) => i.src)).toEqual(['a.jpg', 'a2.jpg', 'a3.jpg', 'a4.jpg', 'b1.jpg']);
  });
  it('works without products', () => {
    expect(buildOrderImages(order).map((i) => i.src)).toEqual(['a.jpg']);
  });
  it('limits thumbnails and handles missing', () => {
    expect(itemThumbnails('p1', products)).toHaveLength(3);
    expect(itemThumbnails('zz', products)).toEqual([]);
    expect(itemThumbnails('p1')).toEqual([]);
  });
  it('prunes selection', () => {
    expect(pruneSelection(['a', 'b'], ['b', 'c'])).toEqual(['b']);
    const s = ['a'];
    expect(pruneSelection(s, ['a'])).toBe(s);
  });
});
