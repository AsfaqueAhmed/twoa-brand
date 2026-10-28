'use client';

import type { ParentCardData } from '../../../domain/cards';

type Props = {
  card: ParentCardData;
  sizes: string[];
  size: string;
  colorName?: string;
  onColor: (name: string) => void;
  onSize: (size: string) => void;
};

const LABEL = 'mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500';

export default function ProductSheet({ card, sizes, size, colorName, onColor, onSize }: Props) {
  return (
    <div className="space-y-6 pb-6">
      <div>
        <h3 className="truncate text-sm font-bold text-zinc-900">{card.parent.name}</h3>
        <p className="text-[11px] uppercase tracking-wider text-zinc-500">SKU: {card.code}</p>
      </div>

      {card.colors.length > 0 && (
        <div>
          <span className={LABEL}>Color{colorName ? ` · ${colorName}` : ''}</span>
          <div className="flex flex-wrap gap-3">
            {card.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                aria-label={c.name}
                aria-pressed={c.name === colorName}
                onClick={() => onColor(c.name)}
                className={`h-11 w-11 rounded-xl border-2 transition active:scale-95 ${
                  c.name === colorName ? 'border-black' : 'border-zinc-200'
                }`}
                style={{ backgroundColor: c.colorCode || '#d4d4d4' }}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <span className={LABEL}>Size</span>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === size}
              onClick={() => onSize(s)}
              className={`min-h-11 min-w-14 rounded-xl border px-4 text-sm font-semibold transition active:scale-95 ${
                s === size ? 'border-black bg-black text-white' : 'border-zinc-200 bg-white text-black'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
