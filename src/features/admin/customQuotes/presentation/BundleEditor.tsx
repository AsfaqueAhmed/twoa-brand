'use client';

import { useState } from 'react';
import {
  MAX_BUNDLE_MEMBERS, bundleSubtotal, describeQuoteLines, quoteTotals, type CustomQuote,
} from '../domain/customQuote';
import { BTN_PRIMARY, formatMoney } from './quoteUi';

type Props = {
  lead: CustomQuote;
  candidates: CustomQuote[];
  members: CustomQuote[];
  previewSrc: (path: string) => string;
  busy: boolean;
  error: string | null;
  onSubmit: (memberIds: string[]) => void;
};

export default function BundleEditor({ lead, candidates, members, previewSrc, busy, error, onSubmit }: Props) {
  const candidateIds = new Set(candidates.map((c) => c.id));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(members.filter((m) => candidateIds.has(m.id)).map((m) => m.id)));
  // Current members that no longer qualify (e.g. declined) are dropped on the next update.
  const stale = members.filter((m) => !candidateIds.has(m.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const current = new Set(members.map((m) => m.id));
  const changed = stale.length > 0 || selected.size !== current.size || [...selected].some((id) => !current.has(id));
  const tooMany = selected.size > MAX_BUNDLE_MEMBERS;
  const chosen = candidates.filter((c) => selected.has(c.id));
  const total = bundleSubtotal([lead, ...chosen]);

  if (candidates.length === 0 && members.length === 0) {
    return <p className="text-xs text-[#717171]">No other priced quotes from this phone number. Price another design from this customer to combine it here.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#717171]">Tick the designs to add to this quote&apos;s checkout link. Their own links stop working while combined.</p>
      <ul className="divide-y divide-[#EEEEEE] rounded-lg border border-[#EEEEEE]">
        {candidates.map((c) => {
          const thumb = c.files.previews[0];
          const sub = quoteTotals(c.lines, c.unitPrice ?? 0).subtotal;
          return (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-xs hover:bg-[#FAF9F6]">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} disabled={busy} className="h-4 w-4 accent-black" />
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewSrc(thumb.path)} alt="" className="h-10 w-10 shrink-0 rounded-md border border-[#EEEEEE] bg-[#FAF9F6] object-contain" />
                ) : (
                  <span className="h-10 w-10 shrink-0 rounded-md border border-[#EEEEEE] bg-[#FAF9F6]" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-black">{c.id}</span>
                  <span className="block text-[#555555]">{c.parentName} · Size {c.teeSize}{c.colorName ? ` · ${c.colorName}` : ''}</span>
                  <span className="block text-[#717171]">{describeQuoteLines(c.lines)} at {formatMoney(c.unitPrice ?? 0)}</span>
                </span>
                <span className="whitespace-nowrap font-medium text-black">{formatMoney(sub)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {stale.length > 0 && (
        <p className="text-[11px] text-amber-700">
          {stale.map((m) => m.id).join(', ')} no longer {stale.length === 1 ? 'qualifies' : 'qualify'} and will be removed when you update.
        </p>
      )}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#717171]">{chosen.length + 1} {chosen.length === 0 ? 'design' : 'designs'} · combined subtotal</span>
        <span className="font-semibold text-black">{formatMoney(total)}</span>
      </div>
      {tooMany && <p className="text-[11px] text-red-700">Combine at most {MAX_BUNDLE_MEMBERS} other designs.</p>}
      <button type="button" disabled={busy || !changed || tooMany} onClick={() => onSubmit([...selected])} className={BTN_PRIMARY}>
        {busy ? 'Updating...' : 'Update combined link'}
      </button>
      {error && <p role="alert" className="text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}
