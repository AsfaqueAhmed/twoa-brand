'use client';

import type { ParentCardData } from '../../domain/cards';

type Props = {
  card: ParentCardData;
  image?: string;
  sizes: string[];
  size: string;
  colorName?: string;
  onColor: (name: string) => void;
  onSize: (size: string) => void;
};

const LABEL = 'mb-2 block lg:mb-1 text-[10px] font-bold uppercase tracking-wider text-[#717171]';

export default function ProductPanel({ card, image, sizes, size, colorName, onColor, onSize }: Props) {
  const { parent, code, colors } = card;
  return (
    <div className="space-y-5 lg:space-y-2.5">
      <div className="flex gap-4 lg:gap-3">
        <div className="h-20 w-20 shrink-0 lg:h-14 lg:w-14 overflow-hidden rounded-md bg-[#F5F5F5]">
          {image && <img src={image} alt={parent.name} className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-black">{parent.name}</h1>
          <p className="mt-1 text-xs lg:mt-0.5 text-[#717171]">
            {parent.category}
            {parent.subcategory ? ` / ${parent.subcategory}` : ''}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-[#717171]">SKU: {code}</p>
        </div>
      </div>

      {colors.length > 0 && (
        <div>
          <span className={LABEL}>Color{colorName ? ` · ${colorName}` : ''}</span>
          <div className="flex flex-wrap gap-2 lg:gap-1.5">
            {colors.map((c) => (
              <button
                key={c.name}
                type="button"
                aria-label={c.name}
                aria-pressed={c.name === colorName}
                onClick={() => onColor(c.name)}
                className={`h-9 w-9 rounded-lg border-2 lg:h-7 lg:w-7 ${c.name === colorName ? 'border-black' : 'border-[#EEEEEE] hover:border-[#717171]'}`}
                style={{ backgroundColor: c.colorCode || '#d4d4d4' }}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <span className={LABEL}>Size</span>
        <div className="flex flex-wrap gap-2 lg:gap-1.5">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === size}
              onClick={() => onSize(s)}
              className={`min-w-12 rounded-lg border px-3 py-2 text-sm lg:min-w-10 lg:px-2.5 lg:py-1 lg:text-xs font-semibold transition-colors ${
                s === size ? 'border-black bg-black text-white' : 'border-[#EEEEEE] bg-white text-black hover:border-black'
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
