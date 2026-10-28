'use client';

import { useState } from 'react';
import {
  persistNewCategory,
  persistNewSubcategory,
  type CategoryDoc,
} from '@/features/catalog/infrastructure/firestoreCategoriesRepository';
import { parentCategoryOptions } from '../domain/parentCategory';

type Props = {
  categories: CategoryDoc[];
  category: string;
  subcategory: string;
  onChange: (category: string, subcategory: string) => void;
  /** Called after a new category/subcategory is persisted so the caller can reload the list. */
  onPersisted: () => Promise<void> | void;
  onError: (message: string) => void;
};

const FIELD =
  'w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none';
const LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5';
const ADD_BTN = 'bg-black hover:bg-[#333333] text-white text-[10px] font-bold uppercase tracking-widest px-3 shrink-0';
const CANCEL_BTN = 'border border-[#EEEEEE] hover:border-black text-black text-[10px] font-bold uppercase tracking-widest px-3 shrink-0';

// Category (required) + dependent Subcategory (optional) selects with inline "add new" flows.
export default function CategoryFields({ categories, category, subcategory, onChange, onPersisted, onError }: Props) {
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [addingSub, setAddingSub] = useState(false);
  const [newSub, setNewSub] = useState('');

  const categoryOptions = parentCategoryOptions(categories, category);
  const subOptions = Array.from(
    new Set([
      ...(categories.find((c) => c.name === category)?.subcategories ?? []),
      ...(subcategory ? [subcategory] : []),
    ]),
  ).sort();

  const confirmCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    onChange(trimmed, '');
    setAddingCategory(false);
    setNewCategory('');
    try {
      await persistNewCategory(trimmed);
      await onPersisted();
    } catch (err: any) {
      onError(err?.message || 'Failed to save the new category.');
    }
  };

  const confirmSub = async () => {
    const trimmed = newSub.trim();
    if (!trimmed || !category) return;
    onChange(category, trimmed);
    setAddingSub(false);
    setNewSub('');
    try {
      await persistNewSubcategory(category, trimmed);
      await onPersisted();
    } catch (err: any) {
      onError(err?.message || 'Failed to save the new subcategory.');
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={LABEL} htmlFor="parent-category">Category*</label>
        {!addingCategory ? (
          <select
            id="parent-category"
            value={category}
            onChange={(e) => {
              if (e.target.value === '__add_new__') setAddingCategory(true);
              else onChange(e.target.value, '');
            }}
            className={FIELD}
          >
            <option value="" disabled>Select a category…</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__add_new__">+ Add new category</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmCategory();
                }
              }}
              placeholder="New category name"
              className={`flex-1 ${FIELD}`}
            />
            <button type="button" onClick={confirmCategory} className={ADD_BTN}>Add</button>
            <button type="button" onClick={() => { setAddingCategory(false); setNewCategory(''); }} className={CANCEL_BTN}>Cancel</button>
          </div>
        )}
      </div>

      <div>
        <label className={LABEL} htmlFor="parent-subcategory">Subcategory (Optional)</label>
        {!addingSub ? (
          <select
            id="parent-subcategory"
            value={subcategory}
            disabled={!category}
            onChange={(e) => {
              if (e.target.value === '__add_new__') setAddingSub(true);
              else onChange(category, e.target.value);
            }}
            className={`${FIELD} disabled:bg-[#FAF9F6] disabled:text-[#919191]`}
          >
            <option value="">None</option>
            {subOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value="__add_new__">+ Add new subcategory</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmSub();
                }
              }}
              placeholder="New subcategory name"
              className={`flex-1 ${FIELD}`}
            />
            <button type="button" onClick={confirmSub} className={ADD_BTN}>Add</button>
            <button type="button" onClick={() => { setAddingSub(false); setNewSub(''); }} className={CANCEL_BTN}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
