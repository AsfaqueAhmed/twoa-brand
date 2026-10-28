'use client';

import { useState } from 'react';
import type { StockAdjustMode } from '../../domain/productList';
import ModalShell from '@/features/admin/presentation/ui/ModalShell';

type Props = {
  parentCount: number;
  skipped: number;
  busy: boolean;
  error: string;
  onApply: (mode: StockAdjustMode, amount: number) => void;
  onClose: () => void;
};

const MODES: { value: StockAdjustMode; label: string }[] = [
  { value: 'set', label: 'Set' },
  { value: 'add', label: 'Add' },
  { value: 'remove', label: 'Remove' },
];

export default function BulkStockModal({ parentCount, skipped, busy, error, onApply, onClose }: Props) {
  const [mode, setMode] = useState<StockAdjustMode>('set');
  const [amount, setAmount] = useState('');
  const valid = /^\d+$/.test(amount.trim());

  return (
    <ModalShell title="Update stock" onClose={onClose} busy={busy}>
      <p className="mb-2 text-xs text-[#717171]">
        Stock is shared by every product of a parent product. The change is applied to every size of each parent product, so all products linked to it are affected.
      </p>
      <p className="mb-4 text-xs font-semibold text-black">
        {parentCount} distinct parent product{parentCount === 1 ? '' : 's'} will change.
        {skipped > 0 && <span className="font-normal text-amber-700"> {skipped} selected product{skipped === 1 ? ' has' : 's have'} no parent product and will be skipped.</span>}
      </p>
      <div className="mb-4 flex gap-4" role="radiogroup" aria-label="Adjustment mode">
        {MODES.map((m) => (
          <label key={m.value} className="flex items-center gap-1.5 text-sm text-black">
            <input type="radio" name="bulk-stock-mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="accent-black" />
            {m.label}
          </label>
        ))}
      </div>
      <label className="mb-1 block text-xs font-semibold text-[#555555]" htmlFor="bulk-stock-amount">Amount (per size)</label>
      <input
        id="bulk-stock-amount"
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full rounded-lg border border-[#EEEEEE] bg-white px-3 py-2.5 text-sm text-black focus:border-black focus:outline-none"
      />
      {error && <p role="alert" className="mt-3 text-xs font-medium text-red-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" data-close disabled={busy} onClick={onClose} className="rounded-lg border border-[#EEEEEE] px-4 py-2 text-sm text-black hover:border-black disabled:opacity-40">Cancel</button>
        <button
          type="button"
          disabled={!valid || parentCount === 0 || busy}
          onClick={() => onApply(mode, Number(amount))}
          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-[#333333] disabled:opacity-40"
        >
          {busy ? 'Updating...' : `Update ${parentCount} parent product${parentCount === 1 ? '' : 's'}`}
        </button>
      </div>
    </ModalShell>
  );
}
