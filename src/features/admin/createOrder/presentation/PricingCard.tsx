'use client';

import { useState } from 'react';
import AdminCard from '@/features/admin/presentation/AdminCard';
import { formatCurrency } from '@/shared/lib/formatCurrency';

const INPUT = 'w-full rounded-md border border-[#EEEEEE] bg-white px-3 py-2 text-sm focus:border-black focus:outline-none';

interface Props {
  subtotal: number;
  districtId: string;
  deliveryFee: number;
  feeOverride: string;
  onFeeOverrideChange: (v: string) => void;
  discount: string;
  onDiscountChange: (v: string) => void;
  promoCode: string | undefined;
  onApplyCoupon: (code: string) => Promise<void>;
  onCouponCodeChange: () => void;
  couponMessage: string | null;
}

export default function PricingCard({
  districtId, deliveryFee, feeOverride, onFeeOverrideChange, discount, onDiscountChange,
  promoCode, onApplyCoupon, onCouponCodeChange, couponMessage,
}: Props) {
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);

  const apply = async () => {
    if (!code.trim()) return;
    setApplying(true);
    try {
      await onApplyCoupon(code.trim());
    } finally {
      setApplying(false);
    }
  };

  const autoFee = feeOverride.trim() === '' ? deliveryFee : null;

  return (
    <AdminCard title="Pricing">
      <div className="space-y-4">
        <label className="block text-xs text-[#717171]">
          Delivery fee override
          <input type="number" min={0} className={INPUT} value={feeOverride} onChange={(e) => onFeeOverrideChange(e.target.value)} placeholder="Leave empty for auto" />
          <span className="mt-1 block">
            {districtId ? (autoFee !== null ? `Auto: ${formatCurrency(autoFee)}` : 'Using manual fee') : 'Select a district to compute the auto fee'}
          </span>
        </label>
        <label className="block text-xs text-[#717171]">
          Discount amount
          <input type="number" min={0} className={INPUT} value={discount} onChange={(e) => onDiscountChange(e.target.value)} />
        </label>
        <div>
          <span className="text-xs text-[#717171]">Coupon code</span>
          <div className="mt-0 flex gap-2">
            <input className={INPUT} value={code} onChange={(e) => { setCode(e.target.value); onCouponCodeChange(); }} placeholder="Enter code" />
            <button type="button" onClick={apply} disabled={applying || !code.trim()} className="rounded-md border border-black px-4 py-2 text-sm font-semibold disabled:opacity-40">
              Apply
            </button>
          </div>
          {promoCode && <p className="mt-1 text-xs text-emerald-700">Applied: {promoCode}</p>}
          {couponMessage && <p className="mt-1 text-xs text-red-700">{couponMessage}</p>}
        </div>
      </div>
    </AdminCard>
  );
}
