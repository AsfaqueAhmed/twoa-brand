'use client';

import { useState } from 'react';
import type { CategoryDoc } from '@/features/catalog/infrastructure/firestoreCategoriesRepository';
import ModalShell from '@/features/admin/presentation/ui/ModalShell';

type Props = {
  count: number;
  categories: CategoryDoc[];
  busy: boolean;
  error: string;
  onApply: (category: string, subcategory: string) => void;
  onClose: () => void;
};

const FIELD = 'w-full rounded-lg border border-[#EEEEEE] bg-white px-3 py-2.5 text-sm text-black focus:border-black focus:outline-none';

export default function BulkCategoryModal({ count, categories, busy, error, onApply, onClose }: Props) {
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const subs = categories.find((c) => c.name === category)?.subcategories ?? [];

  return (
    <ModalShell title="Change category" onClose={onClose} busy={busy}>
      <p className="mb-4 text-xs text-[#717171]">Applies to {count} selected product{count === 1 ? '' : 's'}.</p>
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
          disabled={!category || busy}
          onClick={() => onApply(category, subcategory)}
          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-[#333333] disabled:opacity-40"
        >
          {busy ? 'Applying...' : 'Apply'}
        </button>
      </div>
    </ModalShell>
  );
}
