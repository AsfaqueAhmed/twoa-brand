import { describe, expect, it } from 'vitest';
import { computeOrderBilling, orderNumber } from './orderBilling';

const item = (price: number, quantity: number) => ({ productId: 'p', name: 'n', price, quantity, image: '' });

describe('computeOrderBilling', () => {
  it('derives shipping from total, subtotal and discount', () => {
    const b = computeOrderBilling({ items: [item(690, 1), item(590, 1), item(1190, 1)], discount: 300, totalAmount: 2240 });
    expect(b).toEqual({ subtotal: 2470, discount: 300, shipping: 70, total: 2240 });
  });

  it('treats a missing discount as zero', () => {
    const b = computeOrderBilling({ items: [item(320, 1)], totalAmount: 450 });
    expect(b.shipping).toBe(130);
    expect(b.discount).toBe(0);
  });

  it('never reports negative shipping', () => {
    expect(computeOrderBilling({ items: [item(100, 1)], totalAmount: 50 }).shipping).toBe(0);
  });
});

describe('orderNumber', () => {
  it('uses the last 8 characters, uppercased', () => {
    expect(orderNumber('ord_abcdef0123456789abcd')).toBe('456789ABCD'.slice(-8));
  });
});
