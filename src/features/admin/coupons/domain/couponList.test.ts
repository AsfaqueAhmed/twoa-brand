import { describe, expect, it } from 'vitest';
import type { Coupon } from '@/features/coupons/domain/coupon';
import {
  DEFAULT_COUPON_FILTERS,
  activeCouponFilterCount,
  couponStats,
  couponStatus,
  filterCoupons,
  filterUsageCoupons,
  formatCouponValue,
  sortByUsage,
  usageStats,
  usageSummary,
} from './couponList';

const NOW = new Date('2026-06-01T00:00:00Z');
const make = (o: Partial<Coupon>): Coupon => ({
  code: 'X',
  discountType: 'percentage',
  value: 10,
  usageCount: 0,
  isActive: true,
  isPublic: true,
  createdAt: '',
  updatedAt: '',
  ...o,
});

const list = [
  make({ code: 'LIVE', usageCount: 3 }),
  make({ code: 'OFF', isActive: false, discountType: 'flat', value: 100 }),
  make({ code: 'OLD', expiresAt: '2026-01-01T00:00:00Z', discountType: 'free_shipping', usageCount: 7 }),
  make({ code: 'FULL', usageLimit: 5, usageCount: 5 }),
];

describe('couponStatus', () => {
  it('classifies', () => {
    expect(list.map((c) => couponStatus(c, NOW))).toEqual(['active', 'inactive', 'expired', 'limit']);
  });
  it('inactive beats expired', () => {
    expect(couponStatus(make({ isActive: false, expiresAt: '2020-01-01' }), NOW)).toBe('inactive');
  });
});

describe('filterCoupons', () => {
  it('filters by search, status, type', () => {
    expect(filterCoupons(list, { ...DEFAULT_COUPON_FILTERS, search: ' li ' }, NOW).map((c) => c.code)).toEqual(['LIVE']);
    expect(filterCoupons(list, { ...DEFAULT_COUPON_FILTERS, status: 'expired' }, NOW).map((c) => c.code)).toEqual(['OLD']);
    expect(filterCoupons(list, { ...DEFAULT_COUPON_FILTERS, type: 'flat' }, NOW).map((c) => c.code)).toEqual(['OFF']);
    expect(filterCoupons(list, DEFAULT_COUPON_FILTERS, NOW)).toHaveLength(4);
  });
  it('counts active filters', () => {
    expect(activeCouponFilterCount(DEFAULT_COUPON_FILTERS)).toBe(0);
    expect(activeCouponFilterCount({ search: 'a', status: 'active', type: 'flat' })).toBe(3);
  });
});

describe('couponStats', () => {
  it('computes totals', () => {
    expect(couponStats(list, NOW)).toEqual({ total: 4, active: 1, expired: 1, redemptions: 15 });
  });
});

describe('formatCouponValue', () => {
  it('formats each type', () => {
    expect(formatCouponValue({ discountType: 'percentage', value: 10 })).toBe('10%');
    expect(formatCouponValue({ discountType: 'flat', value: 100 })).toBe('৳100');
    expect(formatCouponValue({ discountType: 'flat', value: 99.5 })).toBe('৳99.50');
    expect(formatCouponValue({ discountType: 'free_shipping', value: 0 })).toBe('Free shipping');
  });
});

describe('usage helpers', () => {
  it('summarises usage', () => {
    expect(usageSummary(make({ usageLimit: 4, usageCount: 1 }))).toEqual({ used: 1, limit: 4, pct: 25 });
    expect(usageSummary(make({ usageLimit: 2, usageCount: 5 })).pct).toBe(100);
    expect(usageSummary(make({ usageCount: 2 }))).toEqual({ used: 2, limit: null, pct: 0 });
  });
  it('sorts', () => {
    expect(sortByUsage(list, 'usage-desc').map((c) => c.code)).toEqual(['OLD', 'FULL', 'LIVE', 'OFF']);
    expect(sortByUsage(list, 'usage-asc').map((c) => c.code)).toEqual(['OFF', 'LIVE', 'FULL', 'OLD']);
    expect(sortByUsage(list, 'code').map((c) => c.code)).toEqual(['FULL', 'LIVE', 'OFF', 'OLD']);
  });
  it('computes usage stats', () => {
    expect(usageStats(list)).toEqual({ used: 3, redemptions: 15, mostUsedCode: 'OLD', mostUsedCount: 7, neverUsed: 1 });
    expect(usageStats([make({})]).mostUsedCode).toBeNull();
  });
  it('filters by code', () => {
    expect(filterUsageCoupons(list, 'fu').map((c) => c.code)).toEqual(['FULL']);
    expect(filterUsageCoupons(list, '')).toHaveLength(4);
  });
});
