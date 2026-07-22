import { describe, it, expect } from 'vitest';
import { computeDeliveryFee, computeTotal, generateOrderId, FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from './pricing';

describe('checkout pricing', () => {
  it('charges delivery fee below the free-delivery threshold', () => {
    expect(computeDeliveryFee(50)).toBe(DELIVERY_FEE);
  });

  it('still charges delivery fee at exactly the threshold, waives it above', () => {
    expect(computeDeliveryFee(FREE_DELIVERY_THRESHOLD)).toBe(DELIVERY_FEE);
    expect(computeDeliveryFee(FREE_DELIVERY_THRESHOLD + 1)).toBe(0);
  });

  it('computes total as subtotal + delivery - discount, rounded to cents', () => {
    expect(computeTotal(100, 4.99, 0)).toBe(104.99);
    expect(computeTotal(50, 4.99, 5)).toBe(49.99);
    expect(computeTotal(10.006, 0, 0)).toBe(10.01);
  });

  it('generates an order id starting with ord_ and 12 hex chars', () => {
    const id = generateOrderId();
    expect(id).toMatch(/^ord_[0-9a-f]{12}$/);
  });
});
