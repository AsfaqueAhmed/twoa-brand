import { supabase } from '@/shared/infrastructure/supabase/client';
import type { Coupon } from '../domain/coupon';

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

export async function fetchCouponByCode(code: string): Promise<Coupon | null> {
  const { data, error } = await supabase.from('coupons').select('*').eq('code', code.toUpperCase()).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toCoupon(data) : null;
}

export async function fetchActiveCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase.from('coupons').select('*').eq('is_active', true);
  if (error) throw new Error(error.message);
  return (data || []).map(toCoupon);
}
