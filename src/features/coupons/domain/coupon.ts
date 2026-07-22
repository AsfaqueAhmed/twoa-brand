export type DiscountType = 'percentage' | 'flat' | 'free_shipping';

export interface Coupon {
  code: string;
  discountType: DiscountType;
  value: number;
  minOrderSubtotal?: number;
  districtRestriction?: string;
  expiresAt?: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function isCouponExpired(coupon: Coupon, now: Date = new Date()): boolean {
  if (!coupon.expiresAt) return false;
  return new Date(coupon.expiresAt).getTime() < now.getTime();
}

export function isUsageLimitReached(coupon: Coupon): boolean {
  if (coupon.usageLimit === undefined) return false;
  return coupon.usageCount >= coupon.usageLimit;
}

export function meetsMinimumSubtotal(coupon: Coupon, subtotal: number): boolean {
  if (coupon.minOrderSubtotal === undefined) return true;
  return subtotal >= coupon.minOrderSubtotal;
}

export function meetsDistrictRestriction(coupon: Coupon, districtId?: string): boolean {
  if (!coupon.districtRestriction) return true;
  return districtId === coupon.districtRestriction;
}

export function computeDiscountAmount(coupon: Coupon, subtotal: number, deliveryFee: number): number {
  if (coupon.discountType === 'percentage') {
    return Math.round(subtotal * (coupon.value / 100) * 100) / 100;
  }
  if (coupon.discountType === 'flat') {
    return coupon.value;
  }
  return deliveryFee;
}

export interface CouponValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateCouponEligibility(
  coupon: Coupon,
  ctx: { subtotal: number; deliveryFee: number; districtId?: string }
): CouponValidationResult {
  if (!coupon.isActive) return { valid: false, reason: 'This coupon is no longer active.' };
  if (isCouponExpired(coupon)) return { valid: false, reason: 'This coupon has expired.' };
  if (isUsageLimitReached(coupon)) return { valid: false, reason: 'This coupon has reached its usage limit.' };
  if (!meetsMinimumSubtotal(coupon, ctx.subtotal)) {
    return {
      valid: false,
      reason: `This coupon requires a minimum subtotal of $${coupon.minOrderSubtotal?.toFixed(2)}.`,
    };
  }
  if (!meetsDistrictRestriction(coupon, ctx.districtId)) {
    return { valid: false, reason: 'This coupon is not valid for your delivery district.' };
  }
  if (coupon.discountType === 'free_shipping' && ctx.deliveryFee === 0) {
    return { valid: false, reason: 'Free shipping is already active for this order.' };
  }
  return { valid: true };
}
