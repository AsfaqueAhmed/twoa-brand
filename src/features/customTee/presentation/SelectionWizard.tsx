'use client';

import { useMemo } from 'react';
import type { ParentProduct, Product } from '@/shared/domain/types';
import {
  type Selection,
  eligibleCategories,
  eligibleSubcategories,
  eligibleSizes,
  eligibleParents,
  selectCategory,
  selectSubcategory,
  selectSize,
  selectParent,
  isComplete,
} from '../domain/selection';
import { buildParentCard } from '../domain/cards';
import ParentCard from './ParentCard';

type Props = {
  parents: ParentProduct[];
  products: Product[];
  selection: Selection;
  onChange: (s: Selection) => void;
  onContinue: () => void;
  notice?: string | null;
  busy?: boolean;
};

const FIELD =
  'w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-sm text-black focus:border-black focus:outline-none disabled:opacity-50';
const LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5';
const NOTE = 'rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]';

export default function SelectionWizard({ parents, products, selection, onChange, onContinue, notice, busy }: Props) {
  const categories = useMemo(() => eligibleCategories(parents), [parents]);
  const subcategories = useMemo(() => eligibleSubcategories(parents, selection.category), [parents, selection.category]);
  const sizes = useMemo(
    () => eligibleSizes(parents, selection.category, selection.subcategory),
    [parents, selection.category, selection.subcategory],
  );
  const matches = useMemo(
    () => eligibleParents(parents, selection.category, selection.subcategory, selection.size),
    [parents, selection.category, selection.subcategory, selection.size],
  );
  const cards = useMemo(() => matches.map((p) => buildParentCard(p, products, selection.size)), [matches, products, selection.size]);
  const chosen = cards.find((c) => c.parent.id === selection.parentId);
  const photo = chosen?.photos[0];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <h1 className="text-xl font-bold uppercase tracking-wider text-black">Design your tee</h1>
        {notice && <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">{notice}</p>}

        <fieldset disabled={!!busy} className="min-w-0 border-0 p-0 m-0 space-y-6">
        <div>
          <label className={LABEL} htmlFor="tee-category">1. Category</label>
          <select
            id="tee-category"
            className={FIELD}
            value={selection.category}
            onChange={(e) => { onChange(selectCategory(selection, e.target.value)); }}
          >
            <option value="">Select a category</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {categories.length === 0 && <p className={`${NOTE} mt-2`}>No tees are available right now.</p>}
        </div>

        {selection.category && (
          <div>
            <label className={LABEL} htmlFor="tee-subcategory">2. Subcategory</label>
            <select
              id="tee-subcategory"
              className={FIELD}
              value={selection.subcategory}
              onChange={(e) => { onChange(selectSubcategory(selection, e.target.value)); }}
            >
              <option value="">Select a subcategory</option>
              {subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {subcategories.length === 0 && (
              <p className={`${NOTE} mt-2`}>No subcategories with available stock in {selection.category} yet.</p>
            )}
          </div>
        )}

        {selection.subcategory && (
          <div>
            <span className={LABEL}>3. Size</span>
            {sizes.length === 0 ? (
              <p className={NOTE}>No matching tees have eligible stock in any size.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={selection.size === s}
                    onClick={() => { onChange(selectSize(selection, s)); }}
                    className={`min-w-12 rounded-lg border px-4 py-2 text-sm font-semibold ${
                      selection.size === s ? 'border-black bg-black text-white' : 'border-[#EEEEEE] bg-white text-black hover:border-black'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selection.size && (
          <div>
            <span className={LABEL}>4. Parent product</span>
            {cards.length === 0 ? (
              <p className={NOTE}>No tees match this selection.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cards.map((card) => (
                  <ParentCard
                    key={card.parent.id}
                    card={card}
                    size={selection.size}
                    selected={card.parent.id === selection.parentId}
                    onSelect={() => { onChange(selectParent(selection, card.parent.id)); }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        </fieldset>

        {isComplete(selection) && (
          <button
            type="button"
            disabled={busy}
            onClick={onContinue}
            className="w-full rounded-lg bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#333333] disabled:opacity-50"
          >
            {busy ? 'Checking stock…' : 'Continue to Design Studio'}
          </button>
        )}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="aspect-square w-full overflow-hidden rounded-xl bg-[#F5F5F5]">
          {photo ? (
            <img src={photo} alt={chosen?.parent.name ?? 'Selected tee'} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-xs text-[#717171]">
              Choose a tee to preview it here.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
