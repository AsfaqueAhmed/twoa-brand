import type { User } from 'firebase/auth';
import { fetchCouponByCode } from '../infrastructure/firestoreCouponsRepository';
import { fetchOrdersForUser } from '@/features/orders/infrastructure/firestoreOrdersRepository';
import { validateCouponEligibility, computeDiscountAmount, type Coupon } from '../domain/coupon';

export interface ApplyCouponResult {
  valid: boolean;
  reason?: string;
  coupon?: Coupon;
  discountAmount?: number;
}

export async function applyCoupon(params: {
  code: string;
  user: User;
  subtotal: number;
  deliveryFee: number;
  districtId?: string;
}): Promise<ApplyCouponResult> {
  const { code, user, subtotal, deliveryFee, districtId } = params;
  const coupon = await fetchCouponByCode(code);
  if (!coupon) return { valid: false, reason: 'Invalid promo code. Please try another one.' };

  const eligibility = validateCouponEligibility(coupon, { subtotal, deliveryFee, districtId });
  if (!eligibility.valid) return { valid: false, reason: eligibility.reason };

  const priorOrders = await fetchOrdersForUser(user.uid);
  const alreadyUsed = priorOrders.some((o) => o.promoCode === coupon.code);
  if (alreadyUsed) {
    return { valid: false, reason: 'You have already used this coupon.' };
  }

  const discountAmount = computeDiscountAmount(coupon, subtotal, deliveryFee);
  return { valid: true, coupon, discountAmount };
}
