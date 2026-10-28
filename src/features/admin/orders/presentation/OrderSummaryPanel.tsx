import { FileText } from 'lucide-react';
import type { Order } from '@/shared/domain/types';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { deliveryZoneLabel, orderBreakdown, orderItemCount } from '../domain/orderView';

export default function OrderSummaryPanel({ order }: { order: Order }) {
  const { subtotal, discount, deliveryFee, total } = orderBreakdown(order);
  const count = orderItemCount(order);

  return (
    <section className="rounded-lg border border-[#EEEEEE] bg-white p-4 text-xs">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-black">
        <FileText className="h-4 w-4" /> Order Summary
      </h4>
      <div className="space-y-2">
        <div className="flex justify-between text-[#555]">
          <span>Subtotal ({count} {count === 1 ? 'item' : 'items'})</span>
          <span className="font-mono">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-[#555]">
          <span>Delivery Fee ({deliveryZoneLabel(deliveryFee)})</span>
          <span className="font-mono">{formatCurrency(deliveryFee)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-[#555]">
            <span>Discount{order.promoCode ? ` (${order.promoCode})` : ''}</span>
            <span className="font-mono text-emerald-700">-{formatCurrency(discount)}</span>
          </div>
        )}
      </div>
      <div className="mt-3 flex justify-between border-t border-[#F5F5F5] pt-3 text-base font-bold text-black">
        <span>Total</span>
        <span className="font-mono">{formatCurrency(total)}</span>
      </div>
    </section>
  );
}
