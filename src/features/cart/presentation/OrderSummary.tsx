'use client';

import { ArrowRight, Lock, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { computeSavings } from '../domain/cart';
import { useCart } from './CartProvider';
import TrustBadges from './TrustBadges';

export default function OrderSummary() {
  const { items, subtotal, count } = useCart();
  const router = useRouter();
  const savings = computeSavings(items);

  return (
    <aside className="border border-[#EEEEEE] bg-white p-6 space-y-5 lg:sticky lg:top-28" id="order-summary">
      <h2 className="text-2xl font-bold text-black">Order Summary</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-[#717171]">
          <span>Subtotal ({count} {count === 1 ? 'item' : 'items'})</span>
          <span className="text-black">{formatCurrency(subtotal)}</span>
        </div>
        {savings > 0 && (
          <div className="flex justify-between text-[#717171]">
            <span>You save</span>
            <span className="text-red-500">{formatCurrency(savings)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-baseline border-t border-[#EEEEEE] pt-4">
        <span className="text-base font-bold text-black">Total</span>
        <span className="text-2xl font-bold text-black">{formatCurrency(subtotal)}</span>
      </div>
      <p className="text-[11px] text-[#717171] -mt-3">Delivery fee and promo codes are applied at checkout.</p>

      <div className="flex items-center gap-3 bg-[#F9F9F9] border border-[#EEEEEE] p-4">
        <Truck className="h-6 w-6 text-black shrink-0" />
        <div>
          <p className="text-xs font-bold text-black">Cash on Delivery</p>
          <p className="text-[11px] text-[#717171]">Pay when you receive your order</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push('/checkout')}
        className="flex w-full items-center justify-center gap-2 bg-black py-4 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-[#333333] transition-colors"
        id="proceed-to-checkout-btn"
      >
        <Lock className="h-4 w-4" />
        <span>Proceed to Checkout</span>
        <ArrowRight className="h-4 w-4" />
      </button>

      <TrustBadges />
    </aside>
  );
}
