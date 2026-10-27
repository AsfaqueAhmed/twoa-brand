'use client';

import { useEffect, useRef, useState } from 'react';
import type { OrderStatus } from '@/shared/domain/types';
import { STATUS_LABELS, STATUS_ORDER } from '@/features/admin/analytics/domain/analytics';

interface Props {
  total: number;
  selectedCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onApply: (status: OrderStatus) => Promise<void>;
  onClear: () => void;
  busy: boolean;
}

export default function BulkToolbar({ total, selectedCount, allSelected, onToggleAll, onApply, onClear, busy }: Props) {
  const [status, setStatus] = useState<OrderStatus>('confirmed');
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = selectedCount > 0 && !allSelected;
  }, [selectedCount, allSelected]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#EEEEEE] bg-white px-4 py-2.5 text-xs">
      <input
        ref={checkboxRef}
        type="checkbox"
        aria-label="Select all orders"
        checked={allSelected && total > 0}
        onChange={onToggleAll}
        disabled={busy}
        className="h-4 w-4 rounded border-[#CCCCCC] accent-black"
      />
      <span className="font-semibold text-black">{selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}</span>
      {selectedCount > 0 && (
        <>
          <select
            aria-label="Bulk order status"
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            disabled={busy}
            className="rounded-lg border border-[#EEEEEE] bg-[#FAF9F6] px-3 py-1.5 text-xs font-semibold text-black focus:border-black focus:outline-none"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onApply(status)}
            disabled={busy}
            className="rounded-lg bg-black px-4 py-1.5 font-bold text-white hover:bg-[#222222] disabled:opacity-50"
          >
            {busy ? 'Applying...' : 'Apply'}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={busy}
            className="rounded-lg border border-[#EEEEEE] px-3 py-1.5 font-semibold text-black hover:border-black disabled:opacity-50"
          >
            Clear
          </button>
        </>
      )}
    </div>
  );
}
