import { Gift, Tag } from 'lucide-react';
import type { Coupon } from '@/features/coupons/domain/coupon';
import { formatCurrency } from '@/shared/lib/formatCurrency';

interface Props {
  promoInput: string;
  onPromoInputChange: (value: string) => void;
  onApply: (code: string) => void;
  appliedCoupon: Coupon | null;
  offers: Coupon[];
  promoError: string;
  promoSuccess: string;
}

function offerTitle(c: Coupon): string {
  if (c.discountType === 'percentage') return `${c.value}% off`;
  if (c.discountType === 'flat') return `${formatCurrency(c.value)} off`;
  return 'Free delivery';
}

function offerNote(c: Coupon): string {
  const parts = [];
  if (c.minOrderSubtotal) parts.push(`Min. order ${formatCurrency(c.minOrderSubtotal)}.`);
  if (c.districtRestriction) parts.push('Restricted delivery area.');
  return parts.join(' ') || 'No minimum order.';
}

export default function PromoCard({
  promoInput,
  onPromoInputChange,
  onApply,
  appliedCoupon,
  offers,
  promoError,
  promoSuccess,
}: Props) {
  return (
    <section className="border border-[#EEEEEE] bg-white p-5 sm:p-6" id="checkout-promo-card">
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-black">
        <Tag className="h-5 w-5" />
        <span>Promo Code</span>
      </h2>
      <p className="text-xs text-[#717171] mt-1">Have a coupon code? Apply it below.</p>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={promoInput}
          onChange={(e) => onPromoInputChange(e.target.value)}
          placeholder="Enter promo code"
          className="flex-1 min-w-0 border border-[#EEEEEE] bg-[#FAF9F6] py-3 px-4 text-base sm:text-sm text-black placeholder-[#A1A1A1] focus:border-black focus:bg-white focus:outline-none font-mono uppercase"
          id="promo-code-input"
        />
        <button
          type="button"
          onClick={() => onApply(promoInput)}
          className="bg-black px-6 text-sm font-bold text-white hover:bg-[#333333] transition-colors"
          id="apply-promo-btn"
        >
          Apply
        </button>
      </div>

      {promoError && (
        <p className="text-xs text-red-600 font-bold mt-2 animate-in fade-in duration-150" id="promo-error-msg">
          {promoError}
        </p>
      )}
      {promoSuccess && (
        <p className="text-xs text-green-600 font-bold mt-2 animate-in fade-in duration-150" id="promo-success-msg">
          {promoSuccess}
        </p>
      )}

      <div className="mt-6 border-t border-[#EEEEEE] pt-4">
        <h3 className="text-sm font-bold text-black">Available Offers ({offers.length})</h3>
        <p className="text-xs text-[#717171] mt-0.5">Select an offer to apply. Only one offer can be used at a time.</p>

        {offers.length === 0 ? (
          <p className="text-xs text-[#919191] italic mt-3">No active promotions right now.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {offers.map((c) => {
              const selected = appliedCoupon?.code === c.code;
              return (
                <div
                  key={c.code}
                  className={`flex flex-col gap-3 border p-3 transition-colors ${
                    selected ? 'border-black ring-1 ring-black' : 'border-[#EEEEEE]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        selected ? 'border-black' : 'border-[#C8C8C8]'
                      }`}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-black" />}
                    </span>
                    <Gift className="h-5 w-5 text-[#E2583E] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-black">{offerTitle(c)}</p>
                      <p className="text-[11px] font-mono tracking-wider text-[#717171]">{c.code}</p>
                      <p className="text-[11px] text-[#717171] mt-0.5">{offerNote(c)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onPromoInputChange(c.code);
                      onApply(c.code);
                    }}
                    className={`mt-auto py-2 text-xs font-bold border transition-colors ${
                      selected
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-[#DDDDDD] hover:border-black'
                    }`}
                  >
                    {selected ? 'Applied' : 'Apply Offer'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
