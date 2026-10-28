'use client';

import type { ParentCardData } from '../domain/cards';

type Props = { card: ParentCardData; size: string; selected: boolean; onSelect: () => void };

export default function ParentCard({ card, size, selected, onSelect }: Props) {
  const { parent, code, photos, colors, stock } = card;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`min-w-0 border bg-white p-2 text-left transition-colors ${
        selected ? 'border-black ring-1 ring-black' : 'border-[#EEEEEE] hover:border-black'
      }`}
    >
      <div className="aspect-square w-full overflow-hidden bg-[#F5F5F5]">
        {photos[0] ? (
          <img src={photos[0]} alt={parent.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wider text-[#717171]">No photo</div>
        )}
      </div>
      <p className="mt-2 truncate text-xs font-semibold text-black">{parent.name}</p>
      <p className="truncate text-[10px] uppercase tracking-wider text-[#717171]">SKU: {code}</p>
      {colors.length > 0 && <p className="truncate text-[10px] text-[#717171]">{colors.map((c) => c.name).join(', ')}</p>}
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-black">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-600" aria-hidden="true" />
        Size {size}: {stock} pcs
      </p>
    </button>
  );
}
