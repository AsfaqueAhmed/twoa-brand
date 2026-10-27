'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleDot } from 'lucide-react';
import type { OrderStatus } from '@/shared/domain/types';
import { STATUS_LABELS, STATUS_ORDER } from '@/features/admin/analytics/domain/analytics';
import { STATUS_DOT } from '../domain/orderStatusStyle';

interface Props {
  status: OrderStatus;
  onStatusChange: (status: OrderStatus) => void | Promise<void>;
  disabled?: boolean;
}

export default function OrderStatusUpdater({ status, onStatusChange, disabled = false }: Props) {
  const [choice, setChoice] = useState<OrderStatus>(status);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    setChoice(status);
  }, [status]);

  const apply = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await onStatusChange(choice);
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };

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
          disabled={busy || disabled}
          className="w-full rounded-lg border border-[#EEEEEE] bg-[#FAF9F6] py-2.5 pl-8 pr-3 text-xs font-semibold text-black focus:border-black focus:outline-none disabled:opacity-60"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={choice === status || busy || disabled}
        onClick={apply}
        className="mt-3 w-full rounded-lg bg-black py-2.5 text-xs font-bold text-white hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Updating...' : 'Update Status'}
      </button>
    </section>
  );
}
