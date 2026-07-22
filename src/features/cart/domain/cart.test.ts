import { describe, it, expect } from 'vitest';
import { addItem, updateItemQuantity, removeItem, computeSubtotal, computeCartCount } from './cart';
import type { CartItem, Product } from '@/shared/domain/types';

const product: Product = {
  id: 'p1',
  name: 'Widget',
  description: 'A widget',
  price: 10,
  image: 'img.png',
  category: 'Gadgets',
  rating: 5,
  stock: 3,
};

describe('cart domain', () => {
  it('adds a new item', () => {
    const result = addItem([], product, 1);
    expect(result).toEqual([{ product, quantity: 1, selectedSize: undefined, selectedVariant: undefined }]);
  });

  it('merges quantity when the same product/size/variant is added again, clamped to stock', () => {
    const initial: CartItem[] = [{ product, quantity: 2 }];
    const result = addItem(initial, product, 5);
    expect(result[0].quantity).toBe(3); // clamped to stock of 3
  });

  it('updates quantity clamped to stock', () => {
    const initial: CartItem[] = [{ product, quantity: 1 }];
    const result = updateItemQuantity(initial, 'p1', 10, undefined, undefined, product.stock);
    expect(result[0].quantity).toBe(3);
  });

  it('removes an item matching product/size/variant', () => {
    const initial: CartItem[] = [{ product, quantity: 1 }];
    const result = removeItem(initial, 'p1');
    expect(result).toEqual([]);
  });

  it('computes subtotal', () => {
    const items: CartItem[] = [{ product, quantity: 2 }];
    expect(computeSubtotal(items)).toBe(20);
  });

  it('computes cart count', () => {
    const items: CartItem[] = [{ product, quantity: 2 }];
    expect(computeCartCount(items)).toBe(2);
  });
});
