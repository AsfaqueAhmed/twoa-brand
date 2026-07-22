import { describe, it, expect } from 'vitest';
import {
  isCouponExpired,
  isUsageLimitReached,
  meetsMinimumSubtotal,
  meetsDistrictRestriction,
  computeDiscountAmount,
  validateCouponEligibility,
  type Coupon,
} from './coupon';

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    code: 'TESTCODE',
    discountType: 'percentage',
    value: 10,
    usageCount: 0,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('isCouponExpired', () => {
  it('is false when there is no expiry', () => {
    expect(isCouponExpired(makeCoupon())).toBe(false);
  });
  it('is true when expiresAt is in the past', () => {
    expect(isCouponExpired(makeCoupon({ expiresAt: '2020-01-01T00:00:00.000Z' }))).toBe(true);
  });
  it('is false when expiresAt is in the future', () => {
    expect(isCouponExpired(makeCoupon({ expiresAt: '2099-01-01T00:00:00.000Z' }))).toBe(false);
  });
});

describe('isUsageLimitReached', () => {
  it('is false when there is no limit', () => {
    expect(isUsageLimitReached(makeCoupon({ usageCount: 1000 }))).toBe(false);
  });
  it('is true when usageCount meets the limit', () => {
    expect(isUsageLimitReached(makeCoupon({ usageLimit: 5, usageCount: 5 }))).toBe(true);
  });
  it('is false when usageCount is below the limit', () => {
    expect(isUsageLimitReached(makeCoupon({ usageLimit: 5, usageCount: 4 }))).toBe(false);
  });
});

describe('meetsMinimumSubtotal', () => {
  it('is true when there is no minimum', () => {
    expect(meetsMinimumSubtotal(makeCoupon(), 1)).toBe(true);
  });
  it('is false when subtotal is below the minimum', () => {
    expect(meetsMinimumSubtotal(makeCoupon({ minOrderSubtotal: 100 }), 50)).toBe(false);
  });
  it('is true when subtotal meets the minimum', () => {
    expect(meetsMinimumSubtotal(makeCoupon({ minOrderSubtotal: 100 }), 100)).toBe(true);
  });
});

describe('meetsDistrictRestriction', () => {
  it('is true when there is no restriction', () => {
    expect(meetsDistrictRestriction(makeCoupon(), 'anywhere')).toBe(true);
  });
  it('is false when the district does not match', () => {
    expect(meetsDistrictRestriction(makeCoupon({ districtRestriction: 'dhaka_dist' }), 'gazipur')).toBe(false);
  });
  it('is true when the district matches', () => {
    expect(meetsDistrictRestriction(makeCoupon({ districtRestriction: 'dhaka_dist' }), 'dhaka_dist')).toBe(true);
  });
});

describe('computeDiscountAmount', () => {
  it('computes a percentage discount off the subtotal', () => {
    expect(computeDiscountAmount(makeCoupon({ discountType: 'percentage', value: 10 }), 100, 4.99)).toBe(10);
  });
  it('computes a flat discount', () => {
    expect(computeDiscountAmount(makeCoupon({ discountType: 'flat', value: 5 }), 100, 4.99)).toBe(5);
  });
  it('computes free shipping as the delivery fee', () => {
    expect(computeDiscountAmount(makeCoupon({ discountType: 'free_shipping', value: 0 }), 100, 4.99)).toBe(4.99);
  });
});

describe('validateCouponEligibility', () => {
  it('rejects an inactive coupon', () => {
    const result = validateCouponEligibility(makeCoupon({ isActive: false }), { subtotal: 100, deliveryFee: 4.99 });
    expect(result.valid).toBe(false);
  });
  it('rejects free_shipping when delivery is already free', () => {
    const result = validateCouponEligibility(makeCoupon({ discountType: 'free_shipping' }), {
      subtotal: 200,
      deliveryFee: 0,
    });
    expect(result.valid).toBe(false);
  });
  it('accepts a valid, eligible coupon', () => {
    const result = validateCouponEligibility(makeCoupon(), { subtotal: 100, deliveryFee: 4.99 });
    expect(result.valid).toBe(true);
  });
});
