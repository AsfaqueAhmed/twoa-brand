'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Order, Product } from '@/shared/domain/types';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import AdminCard from '@/features/admin/presentation/AdminCard';
import Spinner from '@/shared/ui/Spinner';
import { applyCoupon } from '@/features/coupons/application/applyCoupon';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import { STATUS_LABELS } from '@/features/admin/analytics/domain/analytics';
import { adminUpdateOrder } from '@/features/orders/infrastructure/firestoreOrdersRepository';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import {
  adminOrderTotal, buildAdminOrderItemPayloads, draftSubtotal, validateDraft, type DraftLine,
} from '@/features/admin/createOrder/domain/adminOrder';
import ItemsCard from '@/features/admin/createOrder/presentation/ItemsCard';
import { orderToDraftLines } from '../domain/orderEdit';
import { canEditItems, orderBreakdown, shortOrderId } from '../domain/orderView';

const INPUT = 'w-full rounded-md border border-[#EEEEEE] bg-white px-3 py-2 text-sm focus:border-black focus:outline-none';

export default function EditOrderPage() {
  const id = useSearchParams().get('id');
  const { orders, products, loading, error, reload } = useAdminData({ products: true });
  const order = id ? orders.find((o) => o.id === id) : undefined;

  if (loading) {
    return (
      <div>
        <AdminPageHeader title="Edit Order" subtitle="Loading order..." />
        <div className="flex justify-center py-24"><Spinner /></div>
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <AdminPageHeader title="Edit Order" subtitle="Update customer, items and pricing." />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {error} <button type="button" onClick={reload} className="font-bold underline">Retry</button>
        </div>
      </div>
    );
  }
  if (!order) {
    return (
      <div>
        <AdminPageHeader title="Edit Order" subtitle="Order not found." />
        <div className="rounded-lg border border-[#EEEEEE] bg-white p-6 text-sm">
          We couldn&apos;t find that order.{' '}
          <Link href="/admin/orders" className="font-semibold underline">Back to All Orders</Link>
        </div>
      </div>
    );
  }
  return <EditOrderForm order={order} products={products} />;
}

function EditOrderForm({ order, products }: { order: Order; products: Product[] }) {
  const router = useRouter();
  const initial = useMemo(() => orderBreakdown(order), [order]);
  const itemsEditable = canEditItems(order.status);

  const [userName, setUserName] = useState(order.userName);
  const [phone, setPhone] = useState(order.phone);
  const [address, setAddress] = useState(order.address);
  const [lines, setLines] = useState<DraftLine[]>(() => orderToDraftLines(order, products));
  const [itemsDirty, setItemsDirty] = useState(false);
  const [fee, setFee] = useState(String(initial.deliveryFee));
  const [discount, setDiscount] = useState(initial.discount > 0 ? String(initial.discount) : '');
  const [appliedCode, setAppliedCode] = useState<string | undefined>(order.promoCode || undefined);
  const [couponInputs, setCouponInputs] = useState<{ subtotal: number; deliveryFee: number } | null>(
    order.promoCode ? { subtotal: initial.subtotal, deliveryFee: initial.deliveryFee } : null,
  );
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitGuard = useRef(false);

  const feeNum = Number(fee);
  const feeInvalid = fee.trim() === '' || Number.isNaN(feeNum) || feeNum < 0;
  const deliveryFee = feeInvalid ? 0 : feeNum;
  const subtotal = draftSubtotal(lines);
  const discountNum = Number(discount) || 0;
  const total = adminOrderTotal({ subtotal, deliveryFee, discount: discountNum });
  const effectiveDiscount = Math.min(Math.max(discountNum, 0), subtotal + deliveryFee);

  useEffect(() => {
    if (!appliedCode || !couponInputs) return;
    if (couponInputs.subtotal !== subtotal || couponInputs.deliveryFee !== deliveryFee) {
      setAppliedCode(undefined);
      setDiscount('');
      setCouponInputs(null);
      setCouponMessage('Order changed — re-apply the coupon.');
    }
  }, [appliedCode, couponInputs, subtotal, deliveryFee]);

  const handleApplyCoupon = async () => {
    if (!code.trim()) return;
    setApplying(true);
    setCouponMessage(null);
    const inputs = { subtotal, deliveryFee };
    try {
      const result = await applyCoupon({ code: code.trim(), user: null, subtotal, deliveryFee });
      if (result.valid && result.coupon) {
        setDiscount(String(result.discountAmount ?? 0));
        setAppliedCode(result.coupon.code);
        setCouponInputs(inputs);
      } else {
        setAppliedCode(undefined);
        setCouponInputs(null);
        setDiscount('');
        setCouponMessage(result.reason ?? 'Invalid promo code.');
      }
    } catch (e) {
      setCouponMessage(e instanceof Error ? e.message : 'Failed to apply coupon.');
    } finally {
      setApplying(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting || submitGuard.current) return;
    setError('');
    if (feeInvalid) return setError('Delivery fee must be a non-negative number.');
    const invalid = validateDraft({ name: userName, phone, address, lines });
    if (invalid) return setError(invalid);

    submitGuard.current = true;
    setSubmitting(true);
    try {
      await adminUpdateOrder(order.id, {
        userName: userName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        items: itemsEditable && itemsDirty ? buildAdminOrderItemPayloads(lines) : null,
        totalAmount: total,
        promoCode: appliedCode,
        discount: effectiveDiscount,
      });
      router.push('/admin/orders');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update order. Please try again.');
      setSubmitting(false);
      submitGuard.current = false;
    }
  };

  return (
    <div>
      <AdminPageHeader title="Edit Order" subtitle={`${shortOrderId(order.id)} · ${STATUS_LABELS[order.status]}`} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <AdminCard title="Customer">
            <div className="space-y-4">
              <label className="block text-xs text-[#717171]">
                Name
                <input className={INPUT} value={userName} onChange={(e) => setUserName(e.target.value)} />
              </label>
              <label className="block text-xs text-[#717171]">
                Phone
                <input className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label className="block text-xs text-[#717171]">
                Delivery address
                <textarea className={INPUT} rows={3} maxLength={500} value={address} onChange={(e) => setAddress(e.target.value)} />
              </label>
            </div>
          </AdminCard>

          {itemsEditable ? (
            <ItemsCard
              products={products}
              lines={lines}
              onChange={(next) => { setLines(next); setItemsDirty(true); }}
            />
          ) : (
            <AdminCard title="Items">
              <p className="mb-3 rounded-md border border-[#EEEEEE] bg-[#FAF9F6] p-3 text-xs text-[#717171]">
                Items can&apos;t be changed once an order is out for delivery, delivered or cancelled.
              </p>
              <ul className="divide-y divide-[#EEEEEE] text-sm">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name} <span className="font-normal text-[#717171]">× {item.quantity}</span></p>
                      <p className="text-xs text-[#717171]">
                        {[item.selectedSize, item.selectedVariant?.name].filter(Boolean).join(' / ')}
                      </p>
                    </div>
                    <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </AdminCard>
          )}
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <AdminCard title="Pricing">
            <div className="space-y-4">
              <label className="block text-xs text-[#717171]">
                Delivery fee
                <input type="number" min={0} className={INPUT} value={fee} onChange={(e) => setFee(e.target.value)} />
              </label>
              <label className="block text-xs text-[#717171]">
                Discount amount
                <input
                  type="number"
                  min={0}
                  className={INPUT}
                  value={discount}
                  onChange={(e) => { setDiscount(e.target.value); setAppliedCode(undefined); setCouponInputs(null); }}
                />
              </label>
              <div>
                <span className="text-xs text-[#717171]">Coupon code</span>
                <div className="flex gap-2">
                  <input
                    className={INPUT}
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setCouponMessage(null); }}
                    placeholder="Enter code"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={applying || !code.trim()}
                    className="rounded-md border border-black px-4 py-2 text-sm font-semibold disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
                {appliedCode && <p className="mt-1 text-xs text-emerald-700">Applied: {appliedCode}</p>}
                {couponMessage && <p className="mt-1 text-xs text-red-700">{couponMessage}</p>}
              </div>
            </div>
          </AdminCard>
          <AdminCard title="Summary">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-[#717171]">Subtotal</dt><dd>{formatCurrency(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#717171]">Delivery</dt><dd>{formatCurrency(deliveryFee)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#717171]">Discount</dt><dd>-{formatCurrency(effectiveDiscount)}</dd></div>
              <div className="flex justify-between border-t border-[#EEEEEE] pt-2 text-base font-bold"><dt>Total</dt><dd>{formatCurrency(total)}</dd></div>
            </dl>
            {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-4 w-full rounded-md bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href="/admin/orders" className="mt-3 block text-center text-sm font-semibold text-[#717171] underline">Cancel</Link>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
