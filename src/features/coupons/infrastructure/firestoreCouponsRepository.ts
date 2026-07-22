import { doc, getDoc, getDocs, collection, query, where, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { Coupon } from '../domain/coupon';

function toCoupon(id: string, data: Record<string, any>): Coupon {
  return {
    code: id,
    discountType: data.discountType,
    value: Number(data.value) || 0,
    minOrderSubtotal: data.minOrderSubtotal !== undefined ? Number(data.minOrderSubtotal) : undefined,
    districtRestriction: data.districtRestriction || undefined,
    expiresAt: data.expiresAt || undefined,
    usageLimit: data.usageLimit !== undefined ? Number(data.usageLimit) : undefined,
    usageCount: Number(data.usageCount) || 0,
    isActive: !!data.isActive,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || '',
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || '',
  };
}

export async function fetchCouponByCode(code: string): Promise<Coupon | null> {
  const snap = await getDoc(doc(db, 'coupons', code.toUpperCase()));
  if (!snap.exists()) return null;
  return toCoupon(snap.id, snap.data());
}

export async function fetchActiveCoupons(): Promise<Coupon[]> {
  const q = query(collection(db, 'coupons'), where('isActive', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toCoupon(d.id, d.data()));
}

export async function incrementCouponUsage(code: string): Promise<void> {
  await updateDoc(doc(db, 'coupons', code.toUpperCase()), { usageCount: increment(1) });
}
