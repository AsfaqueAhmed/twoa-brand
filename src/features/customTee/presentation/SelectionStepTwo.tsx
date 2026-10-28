'use client';

import { useMemo } from 'react';
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

export default function SelectionStepTwo({ parents, products, selection, onChange, onBack, onContinue, busy }: Props) {
  const cards = useMemo(
    () =>
      eligibleParents(parents, selection.category, selection.subcategory, selection.size).map((p) =>
        buildParentCard(p, products, selection.size),
      ),
    [parents, products, selection.category, selection.subcategory, selection.size],
  );

  return (
    <div className="space-y-5">
      <p className="text-xs text-[#717171]">
        {selection.category} / {selection.subcategory} · Size {selection.size}
      </p>

      <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
        {cards.length === 0 ? (
          <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">No tees match this selection.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
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
        )}
      </fieldset>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onBack}
          className="rounded-full border border-[#CDCDCD] px-6 py-3.5 text-sm font-bold text-black hover:border-black disabled:opacity-50"
        >
          Back
        </button>
        {isComplete(selection) && (
          <button
            type="button"
            disabled={busy}
            onClick={onContinue}
            className="flex-1 rounded-full bg-black px-6 py-3.5 text-sm font-bold text-white hover:bg-[#333333] disabled:opacity-50"
          >
            {busy ? 'Checking stock…' : 'Continue to Design Studio'}
          </button>
        )}
      </div>
    </div>
  );
}
