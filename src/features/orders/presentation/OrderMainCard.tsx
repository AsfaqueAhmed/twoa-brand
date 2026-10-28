import { useState } from 'react';
import { Copy, Check, MapPin, ShoppingBag } from 'lucide-react';
import type { Order } from '@/shared/domain/types';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { orderNumber } from '../domain/orderBilling';
import OrderStatusStepper from './OrderStatusStepper';
import { ThumbImage } from '@/shared/ui/ThumbImage';

interface Props {
  order: Order;
  canCancel: boolean;
  onCancel: (orderId: string) => void;
}

const STATUS_LABEL: Record<Order['status'], string> = {
  pending: 'Order Placed',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function OrderMainCard({ order, canCancel, onCancel }: Props) {
  const [copied, setCopied] = useState(false);
  const number = orderNumber(order.id);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="space-y-4" id="active-tracking-details">
      <section className="border border-[#EEEEEE] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EEEEEE] pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-black">
              <span>Order #{number}</span>
              <button type="button" onClick={copy} aria-label="Copy order number" className="text-[#717171] hover:text-black">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </h2>
            <p className="text-sm text-[#717171] mt-1">Placed on {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <span
            className={`px-3 py-1.5 text-sm font-bold ${
              order.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-[#F1F7F1] text-[#1F4D2B]'
            }`}
          >
            {STATUS_LABEL[order.status]}
          </span>
        </div>

        <div className="pt-5">
          <OrderStatusStepper status={order.status} />
        </div>

        {canCancel && order.status === 'pending' && (
          <div className="flex justify-end mt-4 pt-4 border-t border-[#EEEEEE]">
            <button
              onClick={() => onCancel(order.id)}
              className="border border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-[#F5F5F5] transition-colors"
              id="cancel-order-user-btn"
            >
              Cancel Order
            </button>
          </div>
        )}
      </section>

      <section className="border border-[#EEEEEE] bg-white p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-black">
          <MapPin className="h-5 w-5" />
          <span>Delivery Address</span>
        </h3>
        <div className="mt-2 text-sm text-[#717171] leading-relaxed">
          <p className="font-medium text-black">{order.userName}</p>
          <p>{order.address}</p>
          <p>Phone: {order.phone}</p>
        </div>
      </section>

      <section className="border border-[#EEEEEE] bg-white p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-black">
          <ShoppingBag className="h-5 w-5" />
          <span>Order Items ({order.items.reduce((n, i) => n + i.quantity, 0)})</span>
        </h3>
        <div className="mt-3 divide-y divide-[#EEEEEE]">
          {order.items.map((item, idx) => (
            <div
              key={`${item.productId}-${item.selectedSize || ''}-${item.selectedVariant?.id || ''}-${idx}`}
              className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
            >
              <ThumbImage
                src={item.selectedVariant?.image || item.image}
                alt={item.name}
                className="h-16 w-14 object-cover bg-[#F5F5F5] border border-[#EEEEEE] shrink-0"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-black truncate">{item.name}</p>
                <p className="text-xs text-[#717171] mt-0.5">
                  {[item.selectedVariant && `Color: ${item.selectedVariant.name}`, item.selectedSize && `Size: ${item.selectedSize}`]
                    .filter(Boolean)
                    .join('  |  ')}
                </p>
              </div>
              <span className="text-xs text-[#717171] shrink-0">Qty: {item.quantity}</span>
              <span className="text-sm font-bold text-black w-20 text-right shrink-0">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
