'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleDot } from 'lucide-react';
import type { OrderStatus } from '@/shared/domain/types';
import OrderStatusMenu from './OrderStatusMenu';

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
      <OrderStatusMenu status={choice} onChange={setChoice} disabled={busy || disabled} fullWidth />
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
