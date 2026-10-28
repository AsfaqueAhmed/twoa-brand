'use client';

import { useState } from 'react';
import type { CategoryDoc } from '@/features/catalog/infrastructure/firestoreCategoriesRepository';
import ModalShell from '@/features/admin/presentation/ui/ModalShell';

type Props = {
  parentCount: number;
  productCount: number;
  /** Selected products without a parent product; they are skipped. */
  skipped: number;
  categories: CategoryDoc[];
  busy: boolean;
  error: string;
  onApply: (category: string, subcategory: string) => void;
  onClose: () => void;
};

const FIELD = 'w-full rounded-lg border border-[#EEEEEE] bg-white px-3 py-2.5 text-sm text-black focus:border-black focus:outline-none';

export default function BulkCategoryModal({ parentCount, productCount, skipped, categories, busy, error, onApply, onClose }: Props) {
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const subs = categories.find((c) => c.name === category)?.subcategories ?? [];

  return (
    <ModalShell title="Change category" onClose={onClose} busy={busy}>
      <p className="mb-2 text-xs text-[#717171]">
        Categories belong to parent products. This changes the category of {parentCount} parent product{parentCount === 1 ? '' : 's'} (from {productCount} selected product{productCount === 1 ? '' : 's'}), and every product linked to {parentCount === 1 ? 'it' : 'them'} will change too, including products you did not select.
      </p>
      {skipped > 0 && (
        <p className="mb-3 text-xs text-amber-700">
          {skipped} selected product{skipped === 1 ? ' has' : 's have'} no parent product and will be skipped.
        </p>
      )}
      {parentCount === 0 && <p className="mb-3 text-xs text-red-700">None of the selected products has a parent product, so there is nothing to change.</p>}
      {categories.length === 0 && <p className="mb-3 text-xs text-amber-700">No categories exist yet. Create one on the Categories page first.</p>}
      <label className="mb-1 block text-xs font-semibold text-[#555555]" htmlFor="bulk-category">Category</label>
      <select id="bulk-category" className={`${FIELD} mb-4`} value={category} onChange={(e) => { setCategory(e.target.value); setSubcategory(''); }}>
        <option value="">Select a category</option>
        {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
      </select>
      <label className="mb-1 block text-xs font-semibold text-[#555555]" htmlFor="bulk-subcategory">Subcategory (optional)</label>
      <select id="bulk-subcategory" className={FIELD} value={subcategory} onChange={(e) => setSubcategory(e.target.value)} disabled={!category || subs.length === 0}>
        <option value="">None</option>
        {subs.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {error && <p role="alert" className="mt-3 text-xs font-medium text-red-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" data-close disabled={busy} onClick={onClose} className="rounded-lg border border-[#EEEEEE] px-4 py-2 text-sm text-black hover:border-black disabled:opacity-40">Cancel</button>
        <button
          type="button"
          disabled={!category || busy || parentCount === 0}
          onClick={() => onApply(category, subcategory)}
          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-[#333333] disabled:opacity-40"
        >
          {busy ? 'Applying...' : 'Apply'}
        </button>
      </div>
    </ModalShell>
  );
}
