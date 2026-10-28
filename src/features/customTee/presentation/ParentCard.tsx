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
      className={`text-left rounded-xl border p-3 bg-white transition-colors ${
        selected ? 'border-black ring-1 ring-black' : 'border-[#EEEEEE] hover:border-black'
      }`}
    >
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-[#F5F5F5]">
        {photos[0] ? (
          <img src={photos[0]} alt={parent.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wider text-[#717171]">No photo</div>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold text-black">{parent.name}</p>
      <p className="text-[10px] uppercase tracking-wider text-[#717171]">SKU: {code}</p>
      {colors.length > 0 && (
        <p className="mt-1 text-xs text-[#717171]">Colors: {colors.map((c) => c.name).join(', ')}</p>
      )}
      <p className="mt-2 text-xs text-black">
        Size {size}: {stock} pcs <span className="ml-1 font-semibold text-green-700">Available</span>
      </p>
    </button>
  );
}
