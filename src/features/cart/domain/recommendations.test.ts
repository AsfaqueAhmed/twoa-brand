import { describe, it, expect } from 'vitest';
import { pickRecommendations } from './recommendations';
import type { CartItem, ParentProduct, Product } from '@/shared/domain/types';

const inStock: ParentProduct = { id: 'pp', name: 'pool', category: '', sizeOrder: ['M'], stockBySize: { M: 5 } };
const soldOut: ParentProduct = { id: 'pp0', name: 'pool0', category: '', sizeOrder: ['M'], stockBySize: { M: 0 } };

const make = (id: string, category: string, rating: number, parentProduct: ParentProduct = inStock): Product => ({
  id, name: id, description: '', price: 10, image: '', category, rating, parentProduct,
});

describe('pickRecommendations', () => {
  const cartItems: CartItem[] = [{ product: make('a', 'Tees', 4), quantity: 1, selectedSize: 'M' }];

  it('excludes cart items and out-of-stock products', () => {
    const all = [make('a', 'Tees', 4), make('b', 'Tees', 3, soldOut), make('c', 'Tees', 3)];
    expect(pickRecommendations(all, cartItems).map((p) => p.id)).toEqual(['c']);
  });

  it('prefers same-category products, then fills with top-rated others', () => {
    const all = [make('x', 'Hoodies', 5), make('c', 'Tees', 2), make('y', 'Hoodies', 4)];
    expect(pickRecommendations(all, cartItems).map((p) => p.id)).toEqual(['c', 'x', 'y']);
  });

  it('respects the limit', () => {
    const all = Array.from({ length: 10 }, (_, i) => make(`p${i}`, 'Tees', 1));
    expect(pickRecommendations(all, cartItems, 4)).toHaveLength(4);
  });

  it('returns top-rated products when the cart is empty', () => {
    const all = [make('x', 'A', 1), make('y', 'B', 5)];
    expect(pickRecommendations(all, []).map((p) => p.id)).toEqual(['y', 'x']);
  });
});
