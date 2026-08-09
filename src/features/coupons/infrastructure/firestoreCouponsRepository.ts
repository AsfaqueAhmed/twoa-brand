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
    isPublic: !!row.is_public,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

// Goes through the get_coupon_by_code RPC (not a plain select) so a private
// coupon can still be applied by its exact code even though it's excluded
// from the public select policy that backs fetchActiveCoupons below.
export async function fetchCouponByCode(code: string): Promise<Coupon | null> {
  const { data, error } = await supabase.rpc('get_coupon_by_code', { p_code: code.toUpperCase() });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  return row ? toCoupon(row) : null;
}

export async function fetchActiveCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase.from('coupons').select('*').eq('is_active', true);
  if (error) throw new Error(error.message);
  return (data || []).map(toCoupon);
}
