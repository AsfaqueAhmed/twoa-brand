'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ParentProduct, Product } from '@/shared/domain/types';
import { type Selection, eligibleParents, selectParent, isComplete } from '../domain/selection';
import { buildParentCard } from '../domain/cards';
import ParentCard from './ParentCard';

type Props = {
  parents: ParentProduct[];
  products: Product[];
  selection: Selection;
  onChange: (s: Selection) => void;
  onBack: () => void;
  onContinue: () => void;
  busy: boolean;
};

const GRID_GAP_PX = 12; // matches Tailwind gap-3
const VISIBLE_ROWS = 2.5;

export default function SelectionStepTwo({ parents, products, selection, onChange, onBack, onContinue, busy }: Props) {
  const cards = useMemo(
    () =>
      eligibleParents(parents, selection.category, selection.subcategory, selection.size).map((p) =>
        buildParentCard(p, products, selection.size),
      ),
    [parents, products, selection.category, selection.subcategory, selection.size],
  );

  // The gallery shows 4 cards per row and exactly 2.5 rows, then scrolls. Row height is measured from the first card.
  const gridRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number | undefined>();
  useLayoutEffect(() => {
    const first = gridRef.current?.firstElementChild as HTMLElement | null;
    if (!first) {
      setMaxHeight(undefined);
      return;
    }
    const measure = () => setMaxHeight(Math.round(first.offsetHeight * VISIBLE_ROWS + GRID_GAP_PX * Math.floor(VISIBLE_ROWS)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(first);
    return () => observer.disconnect();
  }, [cards.length]);

  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-[#717171]">
        {selection.category} / {selection.subcategory} · Size {selection.size}
      </p>

      <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
        {cards.length === 0 ? (
          <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">No tees match this selection.</p>
        ) : (
          <div className="overflow-y-auto p-1" style={{ maxHeight: maxHeight ? maxHeight + 8 : undefined }}>
            <div ref={gridRef} className="grid grid-cols-4 gap-3">
              {cards.map((card) => (
                <ParentCard
                  key={card.parent.id}
                  card={card}
                  size={selection.size}
                  selected={card.parent.id === selection.parentId}
                  onSelect={() => onChange(selectParent(selection, card.parent.id))}
                />
              ))}
            </div>
          </div>
        )}
      </fieldset>

      <div className="sticky bottom-0 mt-auto flex gap-3 bg-white pb-6 pt-8">
        <button
          type="button"
          disabled={busy}
          onClick={onBack}
          className="rounded-lg border border-[#EEEEEE] px-8 py-3.5 text-[11px] font-bold uppercase tracking-widest text-black hover:border-black disabled:opacity-50"
        >
          Back
        </button>
        {isComplete(selection) && (
          <button
            type="button"
            disabled={busy}
            onClick={onContinue}
            className="flex-1 rounded-lg bg-black px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#333333] disabled:opacity-50"
          >
            {busy ? 'Checking stock…' : 'Continue to Design Studio'}
          </button>
        )}
      </div>
    </div>
  );
}
