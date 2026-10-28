'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { OrderStatus } from '@/shared/domain/types';
import { STATUS_DOT } from '../domain/orderStatusStyle';
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
  disabled?: boolean;
  fullWidth?: boolean;
}

export default function OrderStatusMenu({ status, onChange, disabled = false, fullWidth = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${fullWidth ? 'flex w-full' : 'inline-flex'}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Change status"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${fullWidth ? 'w-full' : ''} ${STATUS_STYLES[status]} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        <span className={fullWidth ? 'flex-1 text-left' : ''}>{STATUS_LABELS[status]}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <div role="menu" className={`absolute left-0 top-full z-20 mt-1 rounded-lg border border-[#EEEEEE] bg-white py-1 shadow-lg ${fullWidth ? 'w-full' : 'w-44'}`}>
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                if (s !== status) onChange(s);
              }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-semibold text-black hover:bg-[#F5F5F5]"
            >
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
                {STATUS_LABELS[s]}
              </span>
              {s === status && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
