'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { OrderStatus } from '@/shared/domain/types';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import AdminCard from '@/features/admin/presentation/AdminCard';
import Spinner from '@/shared/ui/Spinner';
import DeliveryInfoCard, { type DeliveryInfoValues } from '@/features/checkout/presentation/DeliveryInfoCard';
import { divisions, districts, thanas, cityCorporations } from '@/features/checkout/infrastructure/bangladeshAreas';
import { computeDeliveryFeeByZone } from '@/features/checkout/domain/pricing';
import { applyCoupon } from '@/features/coupons/application/applyCoupon';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import { STATUS_LABELS, STATUS_ORDER } from '@/features/admin/analytics/domain/analytics';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { adminOrderTotal, draftSubtotal, formatAdminAddress, validateDraft, type DraftLine } from '../domain/adminOrder';
import { createAdminOrder, OrderStatusUpdateError } from '../application/createAdminOrder';
import ItemsCard from './ItemsCard';
import PricingCard from './PricingCard';

const EMPTY_DELIVERY: DeliveryInfoValues = {
  name: '', phone: '', divisionId: '', districtId: '', thanaId: '', cityCorpId: '', streetAddress: '',
};

export default function CreateOrderPage() {
  const router = useRouter();
  const { products, loading, error: loadError, reload } = useAdminData({ products: true });

  const [delivery, setDelivery] = useState<DeliveryInfoValues>(EMPTY_DELIVERY);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [feeOverride, setFeeOverride] = useState('');
  const [discount, setDiscount] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | undefined>(undefined);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponInputs, setCouponInputs] = useState<{ subtotal: number; deliveryFee: number; districtId: string } | null>(null);
  const [orderCreated, setOrderCreated] = useState(false);
  const submitGuard = useRef(false);
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const patch = (p: Partial<DeliveryInfoValues>) => setDelivery((d) => ({ ...d, ...p }));
  const { districtId, cityCorpId, thanaId } = delivery;

  const autoFee = computeDeliveryFeeByZone({ districtId, cityCorpId, thanaId });
  const overrideNum = Number(feeOverride);
  const overrideInvalid = feeOverride.trim() !== '' && (Number.isNaN(overrideNum) || overrideNum < 0);
  const deliveryFee = feeOverride.trim() !== '' && !overrideInvalid ? overrideNum : autoFee;
  const subtotal = draftSubtotal(lines);
  const discountNum = Number(discount) || 0;
  const total = adminOrderTotal({ subtotal, deliveryFee, discount: discountNum });
  const effectiveDiscount = Math.min(Math.max(discountNum, 0), subtotal + deliveryFee);

  useEffect(() => {
    if (!appliedCode || !couponInputs) return;
    if (couponInputs.subtotal !== subtotal || couponInputs.deliveryFee !== deliveryFee || couponInputs.districtId !== districtId) {
      setAppliedCode(undefined);
      setDiscount('');
      setCouponInputs(null);
      setCouponMessage('Order changed — re-apply the coupon.');
    }
  }, [appliedCode, couponInputs, subtotal, deliveryFee, districtId]);

  const handleApplyCoupon = async (code: string) => {
    setCouponMessage(null);
    const inputs = { subtotal, deliveryFee, districtId };
    try {
      const result = await applyCoupon({ code, user: null, subtotal, deliveryFee, districtId: districtId || undefined });
      if (result.valid && result.coupon) {
        setDiscount(String(result.discountAmount ?? 0));
        setAppliedCode(result.coupon.code);
        setCouponInputs(inputs);
        setCouponMessage(null);
      } else {
        setAppliedCode(undefined);
        setCouponInputs(null);
        setDiscount('');
        setCouponMessage(result.reason ?? 'Invalid promo code.');
      }
    } catch (e) {
      setCouponMessage(e instanceof Error ? e.message : 'Failed to apply coupon.');
    }
  };

  const handleSubmit = async () => {
    if (submitting || orderCreated || submitGuard.current) return;
    setError('');
    if (overrideInvalid) {
      setError('Delivery fee must be a non-negative number.');
      return;
    }
    if (!delivery.divisionId) return setError('Please select a division.');
    if (!districtId) return setError('Please select a district.');
    if (!thanaId) return setError('Please select your thana / upazila.');
    const isDhaka = districtId === 'dhaka_dist';
    if (isDhaka && !cityCorpId) return setError('Please select your City Corporation option.');

    const address = formatAdminAddress({
      street: delivery.streetAddress,
      thana: thanas.find((t) => t.id === thanaId)?.name || '',
      cityCorp: isDhaka ? cityCorporations.find((cc) => cc.id === cityCorpId)?.name || '' : '',
      district: districts.find((d) => d.id === districtId)?.name || '',
      division: divisions.find((d) => d.id === delivery.divisionId)?.name || '',
    });
    if (!delivery.streetAddress.trim()) return setError('Please enter the street address / details.');
    const invalid = validateDraft({ name: delivery.name, phone: delivery.phone, address, lines });
    if (invalid) return setError(invalid);

    submitGuard.current = true;
    setSubmitting(true);
    try {
      await createAdminOrder({
        name: delivery.name,
        phone: delivery.phone,
        address,
        lines,
        total,
        promoCode: appliedCode,
        discount: effectiveDiscount,
        status,
      });
      router.push('/admin/orders');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create order. Please try again.');
      if (e instanceof OrderStatusUpdateError) {
        // The order already exists; never allow resubmitting this draft.
        setOrderCreated(true);
      } else {
        setSubmitting(false);
        submitGuard.current = false;
      }
    }
  };

  if (loading) {
    return (
      <div>
        <AdminPageHeader title="Create Order" subtitle="Enter an order taken by phone or message." />
        <div className="flex justify-center py-24"><Spinner /></div>
      </div>
    );
  }
  if (loadError) {
    return (
      <div>
        <AdminPageHeader title="Create Order" subtitle="Enter an order taken by phone or message." />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {loadError} <button type="button" onClick={reload} className="font-bold underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title="Create Order" subtitle="Enter an order taken by phone or message." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <DeliveryInfoCard values={delivery} onChange={patch} />
          <ItemsCard products={products} lines={lines} onChange={setLines} />
          <AdminCard title="Order status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full rounded-md border border-[#EEEEEE] bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </AdminCard>
        </div>
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <PricingCard
            subtotal={subtotal}
            districtId={districtId}
            deliveryFee={autoFee}
            feeOverride={feeOverride}
            onFeeOverrideChange={setFeeOverride}
            discount={discount}
            onDiscountChange={(v) => { setDiscount(v); setAppliedCode(undefined); setCouponInputs(null); }}
            onCouponCodeChange={() => setCouponMessage(null)}
            promoCode={appliedCode}
            onApplyCoupon={handleApplyCoupon}
            couponMessage={couponMessage}
          />
          <AdminCard title="Summary">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-[#717171]">Subtotal</dt><dd>{formatCurrency(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#717171]">Delivery</dt><dd>{formatCurrency(deliveryFee)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#717171]">Discount</dt><dd>-{formatCurrency(effectiveDiscount)}</dd></div>
              <div className="flex justify-between border-t border-[#EEEEEE] pt-2 text-base font-bold"><dt>Total</dt><dd>{formatCurrency(total)}</dd></div>
            </dl>
            {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {orderCreated && (
              <Link href="/admin/orders" className="mt-3 block text-center text-sm font-semibold underline">Open All Orders</Link>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || orderCreated}
              className="mt-4 w-full rounded-md bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Order'}
            </button>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
