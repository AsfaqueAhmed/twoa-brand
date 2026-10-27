'use client';

import { useEffect, useState } from 'react';
import { CircleDot } from 'lucide-react';
import type { OrderStatus } from '@/shared/domain/types';
import { STATUS_LABELS, STATUS_ORDER } from '@/features/admin/analytics/domain/analytics';
import { STATUS_DOT } from './OrderStatusMenu';

interface Props {
  status: OrderStatus;
  onStatusChange: (status: OrderStatus) => void;
}

export default function OrderStatusUpdater({ status, onStatusChange }: Props) {
  const [choice, setChoice] = useState<OrderStatus>(status);

  useEffect(() => {
    setChoice(status);
  }, [status]);

  return (
    <section className="rounded-lg border border-[#EEEEEE] bg-white p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-black">
        <CircleDot className="h-4 w-4" /> Update Order Status
      </h4>
      <div className="relative">
        <span className={`pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${STATUS_DOT[choice]}`} />
        <select
          aria-label="New order status"
          value={choice}
          onChange={(e) => setChoice(e.target.value as OrderStatus)}
          className="w-full rounded-lg border border-[#EEEEEE] bg-[#FAF9F6] py-2.5 pl-8 pr-3 text-xs font-semibold text-black focus:border-black focus:outline-none"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={choice === status}
        onClick={() => onStatusChange(choice)}
        className="mt-3 w-full rounded-lg bg-black py-2.5 text-xs font-bold text-white hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Update Status
      </button>
    </section>
  );
}
