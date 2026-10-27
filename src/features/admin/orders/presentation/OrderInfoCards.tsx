import Link from 'next/link';
import { CreditCard, MapPin, Pencil, Phone, Truck } from 'lucide-react';
import type { Order } from '@/shared/domain/types';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { deliveryZoneDetail, orderBreakdown, paymentStatus } from '../domain/orderView';

const PAY_STYLES = {
  Unpaid: 'bg-amber-50 text-amber-800',
  Paid: 'bg-emerald-50 text-emerald-800',
  Void: 'bg-[#F5F5F5] text-[#717171]',
} as const;

const card = 'flex gap-3 rounded-lg border border-[#EEEEEE] bg-[#FAF9F6] p-4';

export default function OrderInfoCards({ order }: { order: Order }) {
  const { deliveryFee } = orderBreakdown(order);
  const pay = paymentStatus(order.status);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr_1fr]">
      <div className={card}>
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-black" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-black">
              Delivery Address <span className="font-normal text-[#717171]">— Cash on Delivery</span>
            </p>
            <Link href={`/admin/orders/edit?id=${order.id}`} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#717171] hover:text-black">
              <Pencil className="h-3 w-3" /> Edit
            </Link>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-black">{order.address}</p>
        </div>
      </div>

      <div className={card}>
        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-black" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-black">Customer Contact</p>
          <p className="mt-1.5 font-mono text-sm font-semibold text-black">{order.phone}</p>
          <p className="mt-0.5 truncate text-xs text-[#717171]">{order.userEmail || '— (no email)'}</p>
        </div>
      </div>

      <div className={card}>
        <Truck className="mt-0.5 h-4 w-4 shrink-0 text-black" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-black">Delivery Zone</p>
          <p className="mt-1.5 text-xs text-black">{deliveryZoneDetail(order)}</p>
          <span className="mt-1.5 inline-block rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-700">
            {formatCurrency(deliveryFee)}
          </span>
        </div>
      </div>

      <div className={card}>
        <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-black" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-black">Payment Method</p>
          <p className="mt-1.5 text-xs text-black">Cash on Delivery</p>
          <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PAY_STYLES[pay]}`}>{pay}</span>
        </div>
      </div>
    </div>
  );
}
