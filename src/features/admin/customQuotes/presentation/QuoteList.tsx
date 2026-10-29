'use client';

import { useMemo, useState } from 'react';
import StatusPill from '@/features/admin/presentation/ui/StatusPill';
import { FilterSearch } from '@/features/admin/presentation/ui/FilterControls';
import { TABLE_ROW, TableCard, TableScroll, Th } from '@/features/admin/presentation/ui/TableCard';
import { STATUS_LABELS, effectiveStatus, quoteTotals, type CustomQuote, type QuoteStatus } from '../domain/customQuote';
import { QUOTE_TONE, formatDate, formatMoney } from './quoteUi';

const CHIPS: Array<QuoteStatus | 'all'> = ['all', 'new', 'contacted', 'quoted', 'ordered', 'declined', 'expired'];

export function filterQuotes(quotes: CustomQuote[], status: QuoteStatus | 'all', search: string, now: Date = new Date()): CustomQuote[] {
  const q = search.trim().toLowerCase();
  return quotes.filter((x) => {
    if (status !== 'all' && effectiveStatus(x, now) !== status) return false;
    if (!q) return true;
    return [x.id, x.name, x.phone, x.whatsapp, x.parentName].some((v) => v.toLowerCase().includes(q));
  });
}

type Props = {
  quotes: CustomQuote[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  previewSrc: (path: string) => string;
};

export default function QuoteList({ quotes, selectedId, onSelect, previewSrc }: Props) {
  const [status, setStatus] = useState<QuoteStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: quotes.length };
    for (const x of quotes) c[effectiveStatus(x)] = (c[effectiveStatus(x)] ?? 0) + 1;
    return c;
  }, [quotes]);
  const rows = useMemo(() => filterQuotes(quotes, status, search), [quotes, status, search]);

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {CHIPS.map((s) => {
          const active = status === s;
          return (
            <button key={s} type="button" aria-pressed={active} onClick={() => setStatus(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${active ? 'border-black bg-black text-white' : 'border-[#EEEEEE] bg-white text-black hover:border-black'}`}>
              {s === 'all' ? 'All' : STATUS_LABELS[s]} <span className={active ? 'text-white/70' : 'text-[#717171]'}>{counts[s] ?? 0}</span>
            </button>
          );
        })}
      </div>
      <FilterSearch id="admin-quote-search" value={search} onChange={setSearch} placeholder="Search id, name, phone, WhatsApp or tee..." />
      <TableCard>
        <TableScroll
          minWidth="min-w-[640px]"
          head={
            <>
              <Th className="pl-5">Quote</Th>
              <Th>Customer</Th>
              <Th>Tee</Th>
              <Th>Status</Th>
              <Th className="pr-5 text-right">Total</Th>
            </>
          }
        >
          {rows.map((x) => {
            const st = effectiveStatus(x);
            const thumb = x.files.previews[0];
            const selected = x.id === selectedId;
            return (
              <tr key={x.id} className={`${TABLE_ROW} cursor-pointer ${selected ? 'bg-[#FAF9F6]' : ''}`}
                onClick={() => onSelect(x.id)} aria-selected={selected}>
                <td className="py-3 pl-5 pr-3">
                  <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(x.id); }} className="text-left font-medium text-black hover:underline">
                    {x.id.slice(0, 8)}
                  </button>
                  <div className="text-xs text-[#717171]">{formatDate(x.createdAt)}</div>
                </td>
                <td className="px-3">
                  <div className="font-medium text-black">{x.name}</div>
                  <div className="text-xs text-[#717171]">{x.phone}</div>
                </td>
                <td className="px-3">
                  <div className="flex items-center gap-3">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewSrc(thumb.path)} alt="" className="h-10 w-10 shrink-0 rounded-md border border-[#EEEEEE] bg-[#FAF9F6] object-contain" />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-md border border-[#EEEEEE] bg-[#FAF9F6]" />
                    )}
                    <div>
                      <div className="text-black">{x.parentName}</div>
                      <div className="text-xs text-[#717171]">Size {x.teeSize}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3"><StatusPill tone={QUOTE_TONE[st]}>{STATUS_LABELS[st]}</StatusPill></td>
                <td className="whitespace-nowrap py-3 pl-3 pr-5 text-right font-medium text-black">
                  {x.unitPrice != null && x.lines.length ? formatMoney(quoteTotals(x.lines, x.unitPrice).subtotal) : <span className="text-[#A1A1A1]">—</span>}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="py-10 text-center text-sm text-[#717171]">No quotes match your filters.</td></tr>
          )}
        </TableScroll>
      </TableCard>
    </div>
  );
}
