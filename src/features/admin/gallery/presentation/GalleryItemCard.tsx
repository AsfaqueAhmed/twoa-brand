'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import StatusPill from '@/features/admin/presentation/ui/StatusPill';
import { GALLERY_CATEGORY_MAX, GALLERY_TITLE_MAX, normalizeCategory, type AdminGalleryItem } from '../domain/galleryAdmin';
import type { GalleryItemPatch } from '../infrastructure/galleryAdminRepository';

type Props = {
  item: AdminGalleryItem;
  busy: boolean;
  onSave: (item: AdminGalleryItem, patch: GalleryItemPatch) => Promise<void>;
  onDelete: (item: AdminGalleryItem) => void;
};

const INPUT = 'w-full rounded-lg border border-[#EEEEEE] px-2.5 py-1.5 text-xs text-black focus:border-black focus:outline-none disabled:opacity-50';

export default function GalleryItemCard({ item, busy, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(item.title);
  const [category, setCategory] = useState(item.category);
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder));

  const cleanTitle = title.trim().slice(0, GALLERY_TITLE_MAX);
  const cleanCategory = normalizeCategory(category);
  const cleanSort = Number.parseInt(sortOrder, 10);
  const sortValid = Number.isFinite(cleanSort);
  const dirty = cleanTitle !== item.title || cleanCategory !== item.category || (sortValid && cleanSort !== item.sortOrder);
  const canSave = dirty && cleanTitle.length > 0 && sortValid && !busy;

  const reset = () => {
    setTitle(item.title);
    setCategory(item.category);
    setSortOrder(String(item.sortOrder));
  };

  const save = () => {
    if (!canSave) return;
    void onSave(item, { title: cleanTitle, category: cleanCategory, sortOrder: cleanSort });
  };

  return (
    <div className={`flex flex-col rounded-lg border border-[#EEEEEE] bg-white p-3 ${item.active ? '' : 'opacity-70'}`}>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-[#F5F5F5]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.imageUrl} alt={item.title} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
      </div>

      <form
        className="mt-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input aria-label="Title" value={title} maxLength={GALLERY_TITLE_MAX} disabled={busy} onChange={(e) => setTitle(e.target.value)} className={INPUT} />
        <div className="grid grid-cols-[1fr_72px] gap-2">
          <input
            aria-label="Category"
            list="gallery-categories"
            value={category}
            maxLength={GALLERY_CATEGORY_MAX}
            disabled={busy}
            onChange={(e) => setCategory(e.target.value)}
            className={INPUT}
          />
          <input
            aria-label="Sort order"
            type="number"
            step={1}
            value={sortOrder}
            disabled={busy}
            onChange={(e) => setSortOrder(e.target.value)}
            className={INPUT}
          />
        </div>
        {dirty && (
          <div className="flex gap-2">
            <button type="submit" disabled={!canSave} className="flex-1 rounded-lg bg-black py-1.5 text-xs font-semibold text-white hover:bg-[#333333] disabled:opacity-40">
              Save
            </button>
            <button type="button" disabled={busy} onClick={reset} className="flex-1 rounded-lg border border-[#EEEEEE] py-1.5 text-xs font-semibold text-black hover:border-black">
              Cancel
            </button>
          </div>
        )}
      </form>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSave(item, { active: !item.active })}
          title={item.active ? 'Click to hide' : 'Click to show'}
          className="disabled:opacity-50"
        >
          <StatusPill tone={item.active ? 'green' : 'gray'}>{item.active ? 'Live' : 'Hidden'}</StatusPill>
        </button>
        <button
          type="button"
          aria-label="Delete artwork"
          title="Delete artwork"
          disabled={busy}
          onClick={() => onDelete(item)}
          className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
