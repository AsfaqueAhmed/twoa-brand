'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { quoteTotals, validateQuotePricing, type QuoteLine } from '../domain/customQuote';
import { BTN, BTN_PRIMARY, FIELD, formatMoney } from './quoteUi';

const DAY_MS = 86_400_000;

type Props = {
  sizes: string[];
  initialLines: QuoteLine[];
  initialPrice?: number;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (lines: QuoteLine[], unitPrice: number, expiresAt: Date) => void;
};

export default function PricingEditor({ sizes, initialLines, initialPrice, submitLabel, busy, error, onSubmit }: Props) {
  const [rows, setRows] = useState<Array<{ size: string; qty: string }>>(
    initialLines.length ? initialLines.map((l) => ({ size: l.size, qty: String(l.qty) })) : [{ size: sizes[0] ?? '', qty: '1' }],
  );
  const [price, setPrice] = useState(initialPrice != null ? String(initialPrice) : '');
  const [days, setDays] = useState('7');

  const lines: QuoteLine[] = rows.map((r) => ({ size: r.size, qty: Number(r.qty) }));
  const unit = Number(price);
  const dayCount = Number(days);
  const daysOk = Number.isInteger(dayCount) && dayCount >= 1 && dayCount <= 60;
  const problem = validateQuotePricing(lines, unit, sizes) ?? (daysOk ? null : 'Expiry must be a whole number of days from 1 to 60.');
  const totals = useMemo(() => quoteTotals(lines.filter((l) => Number.isFinite(l.qty)), Number.isFinite(unit) ? unit : 0), [rows, price]); // eslint-disable-line react-hooks/exhaustive-deps
  const expiresAt = daysOk ? new Date(Date.now() + dayCount * DAY_MS) : null;

  const setRow = (i: number, patch: Partial<{ size: string; qty: string }>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const unused = sizes.find((s) => !rows.some((r) => r.size === s));

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <select aria-label={`Size row ${i + 1}`} value={r.size} onChange={(e) => setRow(i, { size: e.target.value })} className={`${FIELD} w-28`}>
              {!sizes.includes(r.size) && <option value={r.size}>{r.size || 'Size'}</option>}
              {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input aria-label={`Quantity row ${i + 1}`} type="number" min={1} max={1000} inputMode="numeric" value={r.qty}
              onChange={(e) => setRow(i, { qty: e.target.value })} className={`${FIELD} w-24`} />
            <button type="button" aria-label={`Remove row ${i + 1}`} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
              disabled={rows.length === 1} className={`${BTN} px-2.5`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setRows((rs) => [...rs, { size: unused ?? sizes[0] ?? '', qty: '1' }])} className={BTN}>
          <Plus className="h-3.5 w-3.5" /> Add size
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="quote-price" className="mb-1 block text-xs font-medium text-[#717171]">Price per piece</label>
          <input id="quote-price" type="number" min={0} step="any" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={FIELD} />
        </div>
        <div>
          <label htmlFor="quote-days" className="mb-1 block text-xs font-medium text-[#717171]">Expires in (days)</label>
          <input id="quote-days" type="number" min={1} max={60} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} className={FIELD} />
          <div className="mt-1 text-[11px] text-[#717171]">{expiresAt ? `Until ${expiresAt.toLocaleDateString('en-GB')}` : ' '}</div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[#EEEEEE] pt-3 text-sm">
        <span className="text-[#717171]">{totals.pieces} pieces</span>
        <span className="font-bold text-black" data-testid="quote-total">Total {formatMoney(totals.subtotal)}</span>
      </div>
      {(problem || error) && <p role="alert" className="text-xs font-medium text-red-700">{problem ?? error}</p>}
      <button type="button" disabled={!!problem || busy} onClick={() => expiresAt && onSubmit(lines, unit, expiresAt)} className={`${BTN_PRIMARY} w-full`}>
        {busy ? 'Working...' : submitLabel}
      </button>
    </div>
  );
}
