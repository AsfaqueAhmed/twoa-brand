'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Copy, Pencil, ShoppingCart, User } from 'lucide-react';
import type { Order, OrderStatus, Product } from '@/shared/domain/types';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { formatPlacedOn, orderItemCount, shortOrderId } from '../domain/orderView';
import OrderStatusMenu from './OrderStatusMenu';
import OrderInfoCards from './OrderInfoCards';
import OrderSummaryPanel from './OrderSummaryPanel';
import OrderStatusUpdater from './OrderStatusUpdater';
import OrderQuickActions from './OrderQuickActions';
import OrderItemsPanel from './OrderItemsPanel';

interface Props {
  order: Order;
  onStatusChange: (status: OrderStatus) => void;
  selected?: boolean;
  onToggleSelected?: () => void;
  productsById?: Map<string, Product>;
}

export default function AdminOrderCard({ order, onStatusChange, selected = false, onToggleSelected, productsById }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const count = orderItemCount(order);
  const thumbs = order.items.slice(0, 3);

  const copyId = async () => {
    try {
      if (!navigator.clipboard) return;
      await navigator.clipboard.writeText(order.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable or denied: no-op */
    }
  };

  return (
    <div id={`admin-order-row-${order.id}`} className={`rounded-xl border border-[#EEEEEE] bg-white p-4 shadow-xs ${selected ? 'ring-1 ring-black' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {onToggleSelected && (
          <input
            type="checkbox"
            aria-label={`Select order ${shortOrderId(order.id)}`}
            checked={selected}
            onChange={onToggleSelected}
            className="h-4 w-4 shrink-0 rounded border-[#CCCCCC] accent-black"
          />
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-black">{shortOrderId(order.id).toUpperCase()}</span>
            <button
              type="button"
              aria-label="Copy order id"
              onClick={copyId}
              className="rounded p-1 text-[#717171] hover:bg-[#F5F5F5] hover:text-black"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <OrderStatusMenu status={order.status} onChange={onStatusChange} />
          </div>
          <p className="mt-1 text-[11px] text-[#717171]">Placed on {formatPlacedOn(order.createdAt)}</p>
        </div>

        <div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0F0F0] text-[#919191]">
            <User className="h-5 w-5" />
          </span>
          <div className="min-w-0 text-xs">
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
        </div>

        {!expanded && thumbs.length > 0 && (
          <div className="flex gap-1.5">
            {thumbs.map((item, i) =>
              item.image ? (
                <img
                  key={i}
                  src={item.image}
                  alt={item.name}
                  className="h-10 w-10 rounded-md border border-[#EEEEEE] bg-[#F5F5F5] object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <span key={i} className="h-10 w-10 rounded-md bg-[#F5F5F5]" />
              ),
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-[#717171]">
          <ShoppingCart className="h-5 w-5" />
          <span className="text-sm">{count} {count === 1 ? 'item' : 'items'}</span>
        </div>
        <span className="font-mono text-lg font-bold text-black">{formatCurrency(order.totalAmount)}</span>
        <Link
          id={`admin-order-edit-${order.id}`}
          href={`/admin/orders/edit?id=${order.id}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#EEEEEE] px-3.5 py-2 text-xs font-semibold text-black hover:border-black"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Link>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse order' : 'Expand order'}
          onClick={() => setExpanded((e) => !e)}
          className="rounded-md p-1.5 text-[#717171] hover:bg-[#F5F5F5] hover:text-black"
        >
          <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-[#F5F5F5] pt-4">
          <OrderInfoCards order={order} />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
            <OrderItemsPanel order={order} productsById={productsById} />
            <div className="space-y-3">
              <OrderSummaryPanel order={order} />
              <OrderStatusUpdater status={order.status} onStatusChange={onStatusChange} />
              <OrderQuickActions order={order} onStatusChange={onStatusChange} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
