'use client';

import { useState } from 'react';
import { MessageSquare, Pencil, StickyNote, Trash2 } from 'lucide-react';
import type { Order, OrderStatus } from '@/shared/domain/types';
import OrderNotesPanel from './OrderNotesPanel';

interface Props {
  order: Order;
  onStatusChange: (status: OrderStatus) => void | Promise<void>;
  disabled?: boolean;
}

const btn = 'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-[11px] font-medium';

export default function OrderQuickActions({ order, onStatusChange, disabled = false }: Props) {
  const [notesOpen, setNotesOpen] = useState(false);
  const cancelDisabled = order.status === 'cancelled' || order.status === 'delivered' || disabled;

  const cancel = () => {
    if (window.confirm('Cancel this order?')) onStatusChange('cancelled');
  };

  return (
    <section className="rounded-lg border border-[#EEEEEE] bg-white p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-black">
        <Pencil className="h-4 w-4" /> Quick Actions
      </h4>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          aria-expanded={notesOpen}
          onClick={() => setNotesOpen((o) => !o)}
          className={`${btn} border-[#EEEEEE] text-black hover:border-black ${notesOpen ? 'bg-[#F5F5F5]' : 'bg-white'}`}
        >
          <StickyNote className="h-5 w-5" /> Add Note
        </button>
        <a href={`tel:${order.phone}`} className={`${btn} border-[#EEEEEE] bg-white text-black hover:border-black`}>
          <MessageSquare className="h-5 w-5" /> Contact
        </a>
        <button
          type="button"
          disabled={cancelDisabled}
          onClick={cancel}
          className={`${btn} border-red-200 bg-red-50 text-red-600 hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-red-200`}
        >
          <Trash2 className="h-5 w-5" /> Cancel Order
        </button>
      </div>
      {notesOpen && <OrderNotesPanel orderId={order.id} />}
    </section>
  );
}
