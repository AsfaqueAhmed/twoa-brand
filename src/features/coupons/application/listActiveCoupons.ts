import { fetchActiveCoupons } from '../infrastructure/firestoreCouponsRepository';
import { isCouponExpired, isUsageLimitReached, type Coupon } from '../domain/coupon';

export async function listActiveCoupons(): Promise<Coupon[]> {
  const coupons = await fetchActiveCoupons();
  return coupons.filter((c) => !isCouponExpired(c) && !isUsageLimitReached(c));
}
