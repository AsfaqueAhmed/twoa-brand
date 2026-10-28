import { ChevronRight, Clock, FileText, Headphones, MessageSquare, Phone } from 'lucide-react';
import type { Order } from '@/shared/domain/types';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { computeOrderBilling, orderNumber } from '../domain/orderBilling';
import { SUPPORT_MESSAGE_URL, SUPPORT_PHONE } from './supportContacts';
import { ThumbImage } from '@/shared/ui/ThumbImage';

const Row = ({ label, value, valueClass = 'text-black' }: { label: string; value: string; valueClass?: string }) => (
  <div className="flex justify-between gap-4 text-sm">
    <span className="text-[#717171]">{label}</span>
    <span className={`text-right ${valueClass}`}>{value}</span>
  </div>
);

export function OrderDetailsCard({ order }: { order: Order }) {
  const { subtotal, discount, shipping, total } = computeOrderBilling(order);
  const count = order.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <section className="border border-[#EEEEEE] bg-white p-5 sm:p-6 space-y-3" id="order-details-card">
      <h2 className="flex items-center gap-2.5 text-xl font-bold text-black pb-1">
        <FileText className="h-5 w-5" />
        <span>Order Details</span>
      </h2>
      <Row label="Order Number" value={orderNumber(order.id)} />
      <Row label="Order Date" value={new Date(order.createdAt).toLocaleString()} />
      <Row label="Payment Method" value="Cash on Delivery" />
      <div className="border-t border-[#EEEEEE] pt-3 space-y-3">
        <Row label={`Subtotal (${count} ${count === 1 ? 'item' : 'items'})`} value={formatCurrency(subtotal)} />
        {discount > 0 && (
          <Row
            label={`Discount${order.promoCode ? ` (${order.promoCode})` : ''}`}
            value={`-${formatCurrency(discount)}`}
            valueClass="text-red-500 font-bold"
          />
        )}
        <Row label="Shipping Charge" value={formatCurrency(shipping)} />
      </div>
      <div className="flex items-baseline justify-between bg-[#F1F7F1] px-4 py-3">
        <span className="text-lg font-bold text-black">Total</span>
        <span className="text-2xl font-bold text-black">{formatCurrency(total)}</span>
      </div>
    </section>
  );
}

export function HelpCard() {
  return (
    <section className="border border-[#EEEEEE] bg-white p-5 sm:p-6" id="order-help-card">
      <h2 className="flex items-center gap-2.5 text-xl font-bold text-black">
        <Headphones className="h-5 w-5" />
        <span>Need Help?</span>
      </h2>
      <p className="text-xs text-[#717171] mt-1">If you have any questions about your order, feel free to contact us.</p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
          className="flex items-center gap-3 border border-black p-3 hover:bg-[#F5F5F5] transition-colors"
        >
          <Phone className="h-5 w-5 shrink-0" />
          <span>
            <span className="block text-sm font-bold text-black">Call Us</span>
            <span className="block text-xs text-[#717171]">{SUPPORT_PHONE}</span>
          </span>
        </a>
        <a
          href={SUPPORT_MESSAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 border border-black p-3 hover:bg-[#F5F5F5] transition-colors"
        >
          <MessageSquare className="h-5 w-5 shrink-0" />
          <span>
            <span className="block text-sm font-bold text-black">Message Us</span>
            <span className="block text-xs text-[#717171]">We're here to help</span>
          </span>
        </a>
      </div>
    </section>
  );
}

interface OtherOrdersProps {
  orders: Order[];
  activeId?: string;
  onSelect: (order: Order) => void;
}

export function OtherOrdersCard({ orders, activeId, onSelect }: OtherOrdersProps) {
  if (orders.length === 0) return null;
  return (
    <section className="border border-[#EEEEEE] bg-white p-5 sm:p-6" id="other-orders-card">
      <h2 className="flex items-center gap-2.5 text-xl font-bold text-black">
        <Clock className="h-5 w-5" />
        <span>{activeId ? 'Other Orders' : 'Your Orders'}</span>
      </h2>
      <div className="mt-3 space-y-3">
        {orders.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onSelect(o)}
            className={`flex w-full items-center gap-3 border p-3 text-left transition-colors hover:border-black ${
              o.id === activeId ? 'border-black' : 'border-[#EEEEEE]'
            }`}
            id={`order-row-${o.id}`}
          >
            <ThumbImage
              src={o.items[0]?.selectedVariant?.image || o.items[0]?.image}
              alt=""
              className="h-12 w-11 object-cover bg-[#F5F5F5] border border-[#EEEEEE] shrink-0"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-black">#{orderNumber(o.id)}</span>
              <span className="block text-xs text-[#717171]">{new Date(o.createdAt).toLocaleDateString()}</span>
            </span>
            <span
              className={`px-2.5 py-1 text-xs ${
                o.status === 'delivered'
                  ? 'bg-[#F5F5F5] text-[#717171]'
                  : o.status === 'cancelled'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-[#F1F7F1] text-[#1F4D2B]'
              }`}
            >
              {o.status.replace(/_/g, ' ')}
            </span>
            <ChevronRight className="h-4 w-4 text-[#717171] shrink-0" />
          </button>
        ))}
      </div>
    </section>
  );
}
