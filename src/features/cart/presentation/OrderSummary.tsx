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
    <aside className="border border-[#EEEEEE] bg-white p-4 sm:p-6 space-y-4 sm:space-y-5 lg:sticky lg:top-28" id="order-summary">
      <h2 className="text-xl sm:text-2xl font-bold text-black">Order Summary</h2>

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

      {/* Mobile: pinned to the bottom of the screen with the running total. */}
      <div className="fixed inset-x-0 bottom-0 z-40 max-sm:mb-0! flex items-center gap-4 border-t border-[#EEEEEE] bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:static sm:block sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <div className="shrink-0 sm:hidden">
          <p className="text-[11px] text-[#717171]">Total</p>
          <p className="text-lg font-bold leading-tight text-black">{formatCurrency(subtotal)}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/checkout')}
          className="flex min-w-0 flex-1 items-center justify-center gap-2 bg-black py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#333333] sm:w-full sm:flex-none sm:py-4 sm:tracking-[0.2em]"
          id="proceed-to-checkout-btn"
        >
          <Lock className="h-4 w-4" />
          <span>
            <span className="hidden sm:inline">Proceed to </span>Checkout
          </span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <TrustBadges />
    </aside>
  );
}
