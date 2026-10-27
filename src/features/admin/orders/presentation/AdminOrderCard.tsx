'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Pencil } from 'lucide-react';
import type { Order, OrderStatus } from '@/shared/domain/types';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { orderBreakdown, orderItemCount, shortOrderId } from '../domain/orderView';
import OrderStatusMenu from './OrderStatusMenu';

interface Props {
  order: Order;
  onStatusChange: (status: OrderStatus) => void;
}

const tag = 'rounded-full border border-[#EEEEEE] bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black';

export default function AdminOrderCard({ order, onStatusChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const count = orderItemCount(order);
  const { subtotal, discount, deliveryFee, total } = orderBreakdown(order);
  const thumbs = order.items.slice(0, 3);

  return (
    <div id={`admin-order-row-${order.id}`} className="rounded-lg border border-[#EEEEEE] bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="font-mono text-xs font-bold text-black">{shortOrderId(order.id)}</span>
        <OrderStatusMenu status={order.status} onChange={onStatusChange} />
        <div className="min-w-0 flex-1 basis-40 text-xs">
          <p className="flex items-center gap-2 truncate font-bold text-black">
            {order.userName}
            {order.userId === 'guest' && (
              <span className="rounded-full border border-[#EEEEEE] bg-[#F5F5F5] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#717171]">
                Guest
              </span>
            )}
          </p>
          <p className="font-mono text-[#717171]">{order.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {thumbs.map((item, i) =>
              item.image ? (
                <img
                  key={i}
                  src={item.image}
                  alt={item.name}
                  className="h-7 w-7 rounded-full border-2 border-white bg-[#F5F5F5] object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <span key={i} className="h-7 w-7 rounded-full border-2 border-white bg-[#F5F5F5]" />
              ),
            )}
          </div>
          <span className="text-xs font-semibold text-[#717171]">{count} {count === 1 ? 'item' : 'items'}</span>
        </div>
        <span className="font-mono text-[10px] text-[#919191]">{new Date(order.createdAt).toLocaleString()}</span>
        <span className="font-mono text-sm font-bold text-black">{formatCurrency(order.totalAmount)}</span>
        <Link
          id={`admin-order-edit-${order.id}`}
          href={`/admin/orders/edit?id=${order.id}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#EEEEEE] px-2.5 py-1.5 text-xs font-semibold text-black hover:border-black"
        >
          <Pencil className="h-3 w-3" /> Edit
        </Link>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse order' : 'Expand order'}
          onClick={() => setExpanded((e) => !e)}
          className="rounded-md p-1.5 text-[#717171] hover:bg-[#F5F5F5] hover:text-black"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-[#F5F5F5] pt-4 text-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="block font-medium text-[#717171]">Delivery address — Cash on Delivery</span>
              <p className="mt-0.5 font-semibold leading-relaxed text-black">{order.address}</p>
            </div>
            <div>
              <span className="block font-medium text-[#717171]">Customer email</span>
              <p className="mt-0.5 font-mono text-black">{order.userEmail || '— (guest, no email)'}</p>
            </div>
          </div>

          <div className="divide-y divide-[#F5F5F5] rounded-lg border border-[#EEEEEE] bg-[#FAF9F6] p-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-2.5">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-8 w-8 shrink-0 rounded-md border border-[#EEEEEE] bg-[#F5F5F5] object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  ) : (
                    <span className="h-8 w-8 shrink-0 rounded-md bg-[#F5F5F5]" />
                  )}
                  <div className="min-w-0">
                    <span className="block font-bold text-black">
                      {item.name} <span className="font-normal text-[#717171]">× {item.quantity}</span>
                    </span>
                    <div className="mt-0.5 flex gap-1">
                      {item.selectedVariant && <span className={tag}>{item.selectedVariant.name}</span>}
                      {item.selectedSize && <span className={tag}>Size: {item.selectedSize}</span>}
                    </div>
                  </div>
                </div>
                <span className="font-mono font-bold text-black">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="ml-auto max-w-xs space-y-1.5 rounded-lg border border-[#EEEEEE] bg-white p-4">
            <div className="flex justify-between"><span className="text-[#717171]">Subtotal</span><span className="font-mono">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-[#717171]">Delivery fee</span><span className="font-mono">{formatCurrency(deliveryFee)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between">
                <span className="text-[#717171]">Discount{order.promoCode ? ` (${order.promoCode})` : ''}</span>
                <span className="font-mono text-emerald-700">-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[#F5F5F5] pt-1.5 font-bold text-black">
              <span>Total</span><span className="font-mono">{formatCurrency(total)}</span>
            </div>
            <span className="inline-block rounded-full bg-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Pay on Delivery</span>
          </div>
        </div>
      )}
    </div>
  );
}
