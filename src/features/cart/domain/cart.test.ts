import { describe, it, expect } from 'vitest';
import {
  addItem, updateItemQuantity, removeItem, computeSubtotal, computeCartCount,
  computeSavings, discountPercent, changeVariant,
} from './cart';
import { resolveAvailableStock } from '@/shared/domain/stock';
import type { CartItem, ParentProduct, Product, ProductVariant } from '@/shared/domain/types';

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

describe('cart savings and variants', () => {
  const black: ProductVariant = { id: 'v-black', name: 'Black' };
  const white: ProductVariant = { id: 'v-white', name: 'White' };

  it('discountPercent rounds and is undefined without a discount', () => {
    expect(discountPercent({ ...product, price: 690, originalPrice: 990 })).toBe(30);
    expect(discountPercent(product)).toBeUndefined();
    expect(discountPercent({ ...product, price: 10, originalPrice: 10 })).toBeUndefined();
  });

  it('computeSavings sums (originalPrice - price) * qty only for discounted items', () => {
    const items: CartItem[] = [
      { product: { ...product, price: 690, originalPrice: 990 }, quantity: 2, selectedSize: 'M' },
      { product: { ...product, id: 'p2', price: 590 }, quantity: 1, selectedSize: 'M' },
    ];
    expect(computeSavings(items)).toBe(600);
    expect(computeSavings([])).toBe(0);
  });

  it('changeVariant updates the line in place when no line has the new variant', () => {
    const items: CartItem[] = [{ product, quantity: 2, selectedSize: 'M', selectedVariant: black }];
    const result = changeVariant(items, 'p1', 'M', black, white);
    expect(result).toEqual([{ product, quantity: 2, selectedSize: 'M', selectedVariant: white }]);
  });

  it('changeVariant merges into an existing line, capped at stock', () => {
    const items: CartItem[] = [
      { product, quantity: 2, selectedSize: 'M', selectedVariant: black },
      { product, quantity: 2, selectedSize: 'M', selectedVariant: white },
    ];
    const result = changeVariant(items, 'p1', 'M', black, white);
    expect(result).toHaveLength(1);
    expect(result[0].selectedVariant).toEqual(white);
    expect(result[0].quantity).toBe(3);
  });

  it('changeVariant is a no-op for the same variant or an unknown line', () => {
    const items: CartItem[] = [{ product, quantity: 1, selectedSize: 'M', selectedVariant: black }];
    expect(changeVariant(items, 'p1', 'M', black, black)).toBe(items);
    expect(changeVariant(items, 'nope', 'M', black, white)).toBe(items);
  });
});
