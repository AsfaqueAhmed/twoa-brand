import { describe, it, expect } from 'vitest';
import type { CartItem } from '@/shared/domain/types';
import { buildOrderItemPayload } from './orderItemPayload';

const product = { id: 'p1', name: 'Tee', description: '', price: 500, image: 'tee.png', category: 'c', rating: 0, parentProductId: 'pp1' };

describe('buildOrderItemPayload', () => {
  it('maps a plain cart item', () => {
    const item: CartItem = { product, quantity: 2 };
    expect(buildOrderItemPayload(item)).toEqual({
      productId: 'p1', name: 'Tee', price: 500, quantity: 2, image_url: 'tee.png', parentProductId: 'pp1',
    });
  });
  it('includes size and variant when selected', () => {
    const item: CartItem = { product, quantity: 1, selectedSize: 'M', selectedVariant: { id: 'v1', name: 'Black', colorCode: '#000' } };
    expect(buildOrderItemPayload(item)).toMatchObject({
      selectedSize: 'M',
      selectedVariant: { id: 'v1', name: 'Black', colorCode: '#000', image_url: null },
    });
  });
});
