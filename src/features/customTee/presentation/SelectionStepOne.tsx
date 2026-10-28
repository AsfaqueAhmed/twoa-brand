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

type Props = {
  parents: ParentProduct[];
  selection: Selection;
  onChange: (s: Selection) => void;
  onNext: () => void;
};

const FIELD =
  'w-full rounded-2xl border border-[#CDCDCD] bg-white py-3 px-4 text-sm text-black focus:border-black focus:outline-none';
const LABEL = 'block text-[11px] font-bold uppercase tracking-wider text-[#555555] mb-1.5';
const NOTE = 'rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]';

export default function SelectionStepOne({ parents, selection, onChange, onNext }: Props) {
  const categories = useMemo(() => eligibleCategories(parents), [parents]);
  const subcategories = useMemo(() => eligibleSubcategories(parents, selection.category), [parents, selection.category]);
  const sizes = useMemo(
    () => eligibleSizes(parents, selection.category, selection.subcategory),
    [parents, selection.category, selection.subcategory],
  );

  return (
    <div className="space-y-5">
      <div>
        <label className={LABEL} htmlFor="tee-category">Category</label>
        <select
          id="tee-category"
          className={FIELD}
          value={selection.category}
          onChange={(e) => onChange(selectCategory(selection, e.target.value))}
        >
          <option value="">Select a category</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {categories.length === 0 && <p className={`${NOTE} mt-2`}>No tees are available right now.</p>}
      </div>

      {selection.category && (
        <div>
          <label className={LABEL} htmlFor="tee-subcategory">Subcategory</label>
          <select
            id="tee-subcategory"
            className={FIELD}
            value={selection.subcategory}
            onChange={(e) => onChange(selectSubcategory(selection, e.target.value))}
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
                  className={`min-w-12 rounded-full border px-4 py-2 text-sm font-semibold ${
                    selection.size === s ? 'border-black bg-black text-white' : 'border-[#CDCDCD] bg-white text-black hover:border-black'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isStepOneComplete(selection) && (
        <button
          type="button"
          onClick={onNext}
          className="w-full rounded-full bg-black px-6 py-3.5 text-sm font-bold text-white hover:bg-[#333333]"
        >
          Next
        </button>
      )}
    </div>
  );
}
