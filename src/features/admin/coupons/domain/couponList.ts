import { isCouponExpired, isUsageLimitReached, type Coupon, type DiscountType } from '@/features/coupons/domain/coupon';

export type CouponStatus = 'active' | 'inactive' | 'expired' | 'limit';
export type CouponStatusFilter = '' | CouponStatus;
export type CouponTypeFilter = '' | DiscountType;
export type UsageSort = 'usage-desc' | 'usage-asc' | 'code';

export interface CouponFilters {
  search: string;
  status: CouponStatusFilter;
  type: CouponTypeFilter;
}

export const DEFAULT_COUPON_FILTERS: CouponFilters = { search: '', status: '', type: '' };

/** Inactive wins over expired, which wins over limit reached. */
export function couponStatus(coupon: Coupon, now: Date = new Date()): CouponStatus {
  if (!coupon.isActive) return 'inactive';
  if (isCouponExpired(coupon, now)) return 'expired';
  if (isUsageLimitReached(coupon)) return 'limit';
  return 'active';
}

export function filterCoupons(coupons: Coupon[], f: CouponFilters, now: Date = new Date()): Coupon[] {
  const q = f.search.trim().toLowerCase();
  return coupons.filter((c) => {
    if (q && !c.code.toLowerCase().includes(q)) return false;
    if (f.status && couponStatus(c, now) !== f.status) return false;
    if (f.type && c.discountType !== f.type) return false;
    return true;
  });
}

export function activeCouponFilterCount(f: CouponFilters): number {
  return (f.search.trim() ? 1 : 0) + (f.status ? 1 : 0) + (f.type ? 1 : 0);
}

export function couponStats(coupons: Coupon[], now: Date = new Date()) {
  let active = 0;
  let expired = 0;
  let redemptions = 0;
  for (const c of coupons) {
    const s = couponStatus(c, now);
    if (s === 'active') active++;
    if (s === 'expired') expired++;
    redemptions += c.usageCount;
  }
  return { total: coupons.length, active, expired, redemptions };
}

function formatAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** `10%`, `৳100`, `Free shipping`. */
export function formatCouponValue(coupon: Pick<Coupon, 'discountType' | 'value'>): string {
  if (coupon.discountType === 'percentage') return `${formatAmount(coupon.value)}%`;
  if (coupon.discountType === 'flat') return `৳${formatAmount(coupon.value)}`;
  return 'Free shipping';
}

export function usageSummary(coupon: Coupon): { used: number; limit: number | null; pct: number } {
  const limit = coupon.usageLimit ?? null;
  const pct = limit && limit > 0 ? Math.min(100, Math.round((coupon.usageCount / limit) * 100)) : 0;
  return { used: coupon.usageCount, limit, pct };
}

export function sortByUsage(coupons: Coupon[], sort: UsageSort): Coupon[] {
  const list = [...coupons];
  if (sort === 'code') return list.sort((a, b) => a.code.localeCompare(b.code));
  const dir = sort === 'usage-asc' ? 1 : -1;
  return list.sort((a, b) => dir * (a.usageCount - b.usageCount) || a.code.localeCompare(b.code));
}

export function usageStats(coupons: Coupon[]) {
  let used = 0;
  let redemptions = 0;
  let top: Coupon | null = null;
  for (const c of coupons) {
    if (c.usageCount > 0) used++;
    redemptions += c.usageCount;
    if (c.usageCount > 0 && (!top || c.usageCount > top.usageCount)) top = c;
  }
  return {
    used,
    redemptions,
    mostUsedCode: top ? top.code : null,
    mostUsedCount: top ? top.usageCount : 0,
    neverUsed: coupons.length - used,
  };
}

export function filterUsageCoupons(coupons: Coupon[], search: string): Coupon[] {
  const q = search.trim().toLowerCase();
  return q ? coupons.filter((c) => c.code.toLowerCase().includes(q)) : coupons;
}
