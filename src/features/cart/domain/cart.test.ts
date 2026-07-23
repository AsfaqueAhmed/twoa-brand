import { describe, it, expect } from 'vitest';
import { addItem, updateItemQuantity, removeItem, computeSubtotal, computeCartCount } from './cart';
import { resolveAvailableStock } from '@/shared/domain/stock';
import type { CartItem, ParentProduct, Product } from '@/shared/domain/types';

const parentProduct: ParentProduct = {
  id: 'pp1',
  name: 'Widget Stock Pool',
  sizeOrder: ['M'],
  stockBySize: { M: 3 },
};

const product: Product = {
  id: 'p1',
  name: 'Widget',
  description: 'A widget',
  price: 10,
  image: 'img.png',
  category: 'Gadgets',
  rating: 5,
  parentProductId: parentProduct.id,
  parentProduct,
};

describe('cart domain', () => {
  it('adds a new item', () => {
    const result = addItem([], product, 1, 'M');
    expect(result).toEqual([{ product, quantity: 1, selectedSize: 'M', selectedVariant: undefined }]);
  });

  it('merges quantity when the same product/size/variant is added again, clamped to stock', () => {
    const initial: CartItem[] = [{ product, quantity: 2, selectedSize: 'M' }];
    const result = addItem(initial, product, 5, 'M');
    expect(result[0].quantity).toBe(3); // clamped to stock of 3
  });

  it('updates quantity clamped to stock', () => {
    const initial: CartItem[] = [{ product, quantity: 1, selectedSize: 'M' }];
    const result = updateItemQuantity(initial, 'p1', 10, 'M', undefined, resolveAvailableStock(product, 'M'));
    expect(result[0].quantity).toBe(3);
  });

  it('removes an item matching product/size/variant', () => {
    const initial: CartItem[] = [{ product, quantity: 1, selectedSize: 'M' }];
    const result = removeItem(initial, 'p1', 'M');
    expect(result).toEqual([]);
  });

  it('computes subtotal', () => {
    const items: CartItem[] = [{ product, quantity: 2, selectedSize: 'M' }];
    expect(computeSubtotal(items)).toBe(20);
  });

  it('computes cart count', () => {
    const items: CartItem[] = [{ product, quantity: 2, selectedSize: 'M' }];
    expect(computeCartCount(items)).toBe(2);
  });
});
