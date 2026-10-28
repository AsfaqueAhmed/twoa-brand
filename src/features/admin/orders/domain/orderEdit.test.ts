import { describe, it, expect } from 'vitest';
import type { Order, Product } from '@/shared/domain/types';
import { orderToDraftLines } from './orderEdit';

const product: Product = {
  id: 'p1', name: 'Tee', description: '', price: 999, image: 'tee.png', category: 'c', rating: 0, parentProductId: 'pp1',
  parentProduct: { id: 'pp1', name: 'pp', category: '', sizeOrder: ['M'], stockBySize: { M: 4 } },
};
const order: Order = {
  id: 'ord_x', userId: 'guest', userName: 'A', userEmail: '', address: 'x', phone: '017',
  items: [
    { productId: 'p1', name: 'Tee', price: 320, quantity: 2, image: 'tee.png', selectedSize: 'M', parentProductId: 'pp1' },
    { productId: 'gone', name: 'Old', price: 100, quantity: 1, image: 'o.png', selectedSize: 'L', parentProductId: 'pp9' },
    { productId: 'custom_abc', name: 'Gift wrap', price: 50, quantity: 3, image: '' },
  ],
  totalAmount: 0, status: 'pending', paymentMethod: 'cash_on_delivery', createdAt: '', updatedAt: '',
};

describe('orderToDraftLines', () => {
  const lines = orderToDraftLines(order, [product]);
  it('keeps the historical price but the live product (stock) for known catalog items', () => {
    expect(lines[0]).toMatchObject({ kind: 'catalog', item: { quantity: 2, selectedSize: 'M', product: { id: 'p1', price: 320 } } });
    expect((lines[0] as any).item.product.parentProduct.stockBySize.M).toBe(4);
  });
  it('synthesizes a product for items whose product no longer exists', () => {
    expect(lines[1]).toMatchObject({ kind: 'catalog', item: { selectedSize: 'L', product: { id: 'gone', price: 100, parentProductId: 'pp9' } } });
  });
  it('maps custom_ items to custom lines', () => {
    expect(lines[2]).toEqual({ kind: 'custom', id: 'custom_abc', name: 'Gift wrap', price: 50, quantity: 3 });
  });
  it('keeps the historical name/image for a known product', () => {
    const l = orderToDraftLines({ ...order, items: [{ ...order.items[0], name: 'Old Tee', image: 'old.png' }] }, [product]);
    expect((l[0] as any).item.product).toMatchObject({ name: 'Old Tee', image: 'old.png', parentProductId: 'pp1' });
  });
  it('does not treat a legacy line (no parentProductId) as stock-bearing', () => {
    const { parentProductId, ...legacy } = order.items[0];
    const l = orderToDraftLines({ ...order, items: [legacy] }, [product]);
    expect((l[0] as any).item.product.parentProductId).toBeUndefined();
    expect((l[0] as any).item.product.parentProduct).toBeUndefined();
  });
  it('does not re-parent when the live product moved to another parent', () => {
    const moved: Product = { ...product, parentProductId: 'pp2', parentProduct: { id: 'pp2', name: 'x', category: '', sizeOrder: ['M'], stockBySize: { M: 1 } } };
    const l = orderToDraftLines({ ...order, items: [order.items[0]] }, [moved]);
    expect((l[0] as any).item.product.parentProductId).toBe('pp1');
    expect((l[0] as any).item.product.parentProduct).toBeUndefined();
  });
});
