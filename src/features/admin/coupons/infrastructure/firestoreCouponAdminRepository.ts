import { supabase } from '@/shared/infrastructure/supabase/client';
import type { Coupon, DiscountType } from '@/features/coupons/domain/coupon';

export interface CouponFormPayload {
  code: string;
  discountType: DiscountType;
  value: number;
  minOrderSubtotal?: number;
  districtRestriction?: string;
  expiresAt?: string;
  usageLimit?: number;
  isActive: boolean;
}

function toCoupon(row: Record<string, any>): Coupon {
  return {
    code: row.code,
    discountType: row.discount_type,
    value: Number(row.value) || 0,
    minOrderSubtotal: row.min_order_subtotal != null ? Number(row.min_order_subtotal) : undefined,
    districtRestriction: row.district_restriction ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    usageLimit: row.usage_limit != null ? Number(row.usage_limit) : undefined,
    usageCount: Number(row.usage_count) || 0,
    isActive: !!row.is_active,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

// Only maps keys actually present in payload (via `in`, not `!== undefined`),
// so a partial update like `{ isActive: false }` leaves every other column
// untouched — Postgres UPDATE only ever SETs the columns you give it, unlike
// Firestore's setDoc(merge: true) which needed deleteField() tricks to
// distinguish "not provided" from "explicitly cleared".
function toRow(payload: Partial<CouponFormPayload>): Record<string, any> {
  const row: Record<string, any> = {};
  if ('discountType' in payload) row.discount_type = payload.discountType;
  if ('value' in payload) row.value = payload.value;
  if ('minOrderSubtotal' in payload) row.min_order_subtotal = payload.minOrderSubtotal ?? null;
  if ('districtRestriction' in payload) row.district_restriction = payload.districtRestriction ?? null;
  if ('expiresAt' in payload) row.expires_at = payload.expiresAt ?? null;
  if ('usageLimit' in payload) row.usage_limit = payload.usageLimit ?? null;
  if ('isActive' in payload) row.is_active = payload.isActive;
  return row;
}

export async function listAllCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase.from('coupons').select('*');
  if (error) throw error;
  return (data || []).map(toCoupon);
}

export async function createCoupon(payload: CouponFormPayload): Promise<void> {
  const id = payload.code.trim().toUpperCase();
  const { error } = await supabase.from('coupons').insert({ code: id, ...toRow(payload), usage_count: 0 });
  if (error) throw error;
}

export async function updateCoupon(code: string, payload: Partial<CouponFormPayload>): Promise<void> {
  const { error } = await supabase
    .from('coupons')
    .update({ ...toRow(payload), updated_at: new Date().toISOString() })
    .eq('code', code.toUpperCase());
  if (error) throw error;
}

export async function deleteCoupon(code: string): Promise<void> {
  const { error } = await supabase.from('coupons').delete().eq('code', code.toUpperCase());
  if (error) throw error;
}
