'use client';

import { useMemo } from 'react';
import type { ParentProduct } from '@/shared/domain/types';
import {
  type Selection,
  eligibleCategories,
  eligibleSubcategories,
  eligibleSizes,
  selectCategory,
  selectSubcategory,
  selectSize,
  isStepOneComplete,
} from '../domain/selection';
import Select from './Select';

type Props = {
  parents: ParentProduct[];
  selection: Selection;
  onChange: (s: Selection) => void;
  onNext: () => void;
};

const LABEL = 'mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#717171]';
const NOTE = 'rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]';

export default function SelectionStepOne({ parents, selection, onChange, onNext }: Props) {
  const categories = useMemo(() => eligibleCategories(parents), [parents]);
  const subcategories = useMemo(() => eligibleSubcategories(parents, selection.category), [parents, selection.category]);
  const sizes = useMemo(
    () => eligibleSizes(parents, selection.category, selection.subcategory),
    [parents, selection.category, selection.subcategory],
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-6">
        <div>
          <label className={LABEL} htmlFor="tee-category">Category</label>
          <Select
            id="tee-category"
            value={selection.category}
            options={categories}
            placeholder="Select a category"
            onChange={(v) => onChange(selectCategory(selection, v))}
          />
          {categories.length === 0 && <p className={`${NOTE} mt-2`}>No tees are available right now.</p>}
        </div>

        {selection.category && (
          <div>
            <label className={LABEL} htmlFor="tee-subcategory">Subcategory</label>
            <Select
              id="tee-subcategory"
              value={selection.subcategory}
              options={subcategories}
              placeholder="Select a subcategory"
              onChange={(v) => onChange(selectSubcategory(selection, v))}
            />
            {subcategories.length === 0 && (
              <p className={`${NOTE} mt-2`}>No subcategories with available stock in {selection.category} yet.</p>
            )}
          </div>
        )}

        {selection.subcategory && (
          <div>
            <span className={LABEL}>Size</span>
            {sizes.length === 0 ? (
              <p className={NOTE}>No matching tees have eligible stock in any size.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={selection.size === s}
                    onClick={() => onChange(selectSize(selection, s))}
                    className={`min-w-14 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
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
      </div>

      <div className="sticky bottom-0 mt-auto bg-white pb-6 pt-8">
        {isStepOneComplete(selection) && (
          <button
            type="button"
            onClick={onNext}
            className="w-full rounded-lg bg-black px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#333333]"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
