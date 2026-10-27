'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import type { OrderStatus } from '@/shared/domain/types';
import { STATUS_LABELS, STATUS_ORDER } from '@/features/admin/analytics/domain/analytics';

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-800 border-blue-200',
  out_for_delivery: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  cancelled: 'bg-red-50 text-red-800 border-red-200',
};

interface Props {
  status: OrderStatus;
  onChange: (status: OrderStatus) => void;
}

export default function OrderStatusMenu({ status, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[status]}`}>
        {STATUS_LABELS[status]}
      </span>
      <button
        type="button"
        aria-label="Change status"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1 text-[#717171] hover:bg-[#F5F5F5] hover:text-black"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border border-[#EEEEEE] bg-white py-1 shadow-lg">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onChange(s);
              }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-semibold text-black hover:bg-[#F5F5F5]"
            >
              {STATUS_LABELS[s]}
              {s === status && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
