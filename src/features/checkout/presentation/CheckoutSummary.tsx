import Link from 'next/link';
import { ArrowRight, Lock, ShieldCheck, Tag, X } from 'lucide-react';
import type { CartItem } from '@/shared/domain/types';
import type { Coupon } from '@/features/coupons/domain/coupon';
import { formatCurrency } from '@/shared/lib/formatCurrency';

interface Props {
  items: CartItem[];
  count: number;
  subtotal: number;
  deliveryFee: number;
  zoneLabel: string;
  discountAmount: number;
  appliedCoupon: Coupon | null;
  grandTotal: number;
  isPlacing: boolean;
  onRemovePromo: () => void;
}

export default function CheckoutSummary({
  items,
  count,
  subtotal,
  deliveryFee,
  zoneLabel,
  discountAmount,
  appliedCoupon,
  grandTotal,
  isPlacing,
  onRemovePromo,
}: Props) {
  return (
    <aside className="border border-[#EEEEEE] bg-white p-5 sm:p-6 space-y-5 lg:sticky lg:top-28" id="checkout-summary">
      <div className="flex items-baseline justify-between gap-3 border-b border-[#EEEEEE] pb-4">
        <h2 className="text-2xl font-bold text-black">
          Order Summary <span className="text-sm font-normal text-[#717171]">({count} {count === 1 ? 'item' : 'items'})</span>
        </h2>
        <Link href="/cart" className="text-sm text-black underline underline-offset-2 shrink-0">
          Edit Cart
        </Link>
      </div>

      <div className="divide-y divide-[#EEEEEE]">
        {items.map((item) => {
          const key = `${item.product.id}-${item.selectedSize || 'nosize'}-${item.selectedVariant?.id || 'novariant'}`;
          const { originalPrice, price } = item.product;
          const hasDiscount = !!originalPrice && originalPrice > price;
          return (
            <div key={key} className="flex gap-4 py-4 first:pt-0">
              <img
                src={item.selectedVariant?.image || item.product.image}
                alt={item.product.name}
                className="h-20 w-[72px] object-cover bg-[#F5F5F5] border border-[#EEEEEE] shrink-0"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-black truncate">{item.product.name}</h3>
                <p className="text-xs text-[#717171] mt-1">
                  {[item.selectedVariant && `Color: ${item.selectedVariant.name}`, item.selectedSize && `Size: ${item.selectedSize}`]
                    .filter(Boolean)
                    .join('  |  ')}
                </p>
                <p className="text-xs text-[#717171] mt-0.5">Qty: {item.quantity}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-black">{formatCurrency(price * item.quantity)}</p>
                {hasDiscount && (
                  <p className="text-xs text-[#919191] line-through">{formatCurrency(originalPrice * item.quantity)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 text-sm border-t border-[#EEEEEE] pt-4">
        <div className="flex justify-between text-[#717171]">
          <span>Subtotal ({count} {count === 1 ? 'item' : 'items'})</span>
          <span className="text-black">{formatCurrency(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-[#717171] animate-in fade-in duration-200">
            <span>Discount ({appliedCoupon?.code})</span>
            <span className="font-bold text-red-500">-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-[#717171]">
          <span>Shipping Charge{zoneLabel ? ` (${zoneLabel})` : ''}</span>
          <span className="text-black">{formatCurrency(deliveryFee)}</span>
        </div>
      </div>

      <div className="flex items-baseline justify-between bg-[#F1F7F1] px-4 py-3">
        <span className="text-xl font-bold text-black">Total</span>
        <span className="text-2xl font-bold text-black" id="checkout-grand-total">
          {formatCurrency(grandTotal)}
        </span>
      </div>

      {appliedCoupon && (
        <div className="flex items-center gap-3 border border-[#F3D9D0] bg-[#FDF5F2] p-4" id="checkout-applied-offer">
          <Tag className="h-5 w-5 text-[#E2583E] shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-black">Applied Offer</p>
            <p className="text-xs text-[#717171] font-mono truncate">{appliedCoupon.code}</p>
          </div>
          <button
            type="button"
            onClick={onRemovePromo}
            className="flex items-center gap-1 text-xs text-black underline underline-offset-2"
            id="remove-promo-btn"
          >
            Remove <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 bg-[#F1F7F1] p-4">
        <ShieldCheck className="h-7 w-7 text-[#1F4D2B] shrink-0" />
        <div>
          <p className="text-sm font-bold text-black">100% Risk-Free</p>
          <p className="text-xs text-[#717171]">Check your product before payment. Easy return if there is any issue.</p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPlacing}
        className="flex w-full items-center justify-center gap-2 bg-black py-4 text-sm font-bold text-white hover:bg-[#333333] transition-colors disabled:bg-[#F5F5F5] disabled:text-[#A1A1A1] disabled:cursor-not-allowed"
        id="place-order-submit-btn"
      >
        {isPlacing ? (
          <span>Creating Order...</span>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            <span>Place Order (Cash on Delivery)</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
      <p className="text-center text-[11px] text-[#717171]">
        By placing an order, you agree to our Terms &amp; Conditions and Privacy Policy.
      </p>
    </aside>
  );
}
