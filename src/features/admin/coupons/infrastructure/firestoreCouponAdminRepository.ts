import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
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

export async function listAllCoupons(): Promise<Coupon[]> {
  const snap = await getDocs(collection(db, 'coupons'));
  return snap.docs.map((d) => toCoupon(d.id, d.data()));
}

export async function createCoupon(payload: CouponFormPayload): Promise<void> {
  const id = payload.code.trim().toUpperCase();
  await setDoc(doc(db, 'coupons', id), {
    ...payload,
    code: id,
    usageCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCoupon(code: string, payload: Partial<CouponFormPayload>): Promise<void> {
  await setDoc(doc(db, 'coupons', code.toUpperCase()), { ...payload, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteCoupon(code: string): Promise<void> {
  await deleteDoc(doc(db, 'coupons', code.toUpperCase()));
}
