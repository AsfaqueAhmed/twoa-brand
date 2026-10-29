'use client';

import { useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { ALL_CATEGORY, filterGallery, galleryCategories, type GalleryArtwork } from '../../domain/gallery';
import { useGallery } from '../../application/useGallery';
import { loadGalleryArtworkAsAsset, type GalleryAsset } from '../../application/galleryArtwork';

type Props = { onAdd: (asset: GalleryAsset) => void };

export default function GalleryPanel({ onAdd }: Props) {
  const { items, loading, error, reload } = useGallery();
  const [selected, setSelected] = useState<string>(ALL_CATEGORY);
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const categories = useMemo(() => galleryCategories(items), [items]);
  const category = categories.includes(selected) ? selected : ALL_CATEGORY;
  const visible = useMemo(() => filterGallery(items, category, query), [items, category, query]);

  const pick = async (item: GalleryArtwork) => {
    if (pendingId) return;
    setPendingId(item.id);
    setPickError(null);
    try {
      onAdd(await loadGalleryArtworkAsAsset(item));
    } catch (err) {
      setPickError(err instanceof Error ? err.message : 'Could not load that artwork.');
    } finally {
      setPendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3" aria-busy="true" aria-label="Loading gallery">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-lg border border-[#EEEEEE] p-2">
            <div className="aspect-square animate-pulse rounded-md bg-[#F5F5F5]" />
            <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-[#F5F5F5]" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-[#CDCDCD] px-4 py-8 text-center">
        <p role="alert" className="text-xs text-red-700">{error}</p>
        <button
          type="button"
          onClick={reload}
          className="rounded-lg bg-black px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#333333]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">No artwork yet</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#717171]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artwork"
          aria-label="Search artwork"
          className="w-full rounded-lg border border-[#EEEEEE] py-2 pl-8 pr-8 text-xs text-black placeholder-[#717171] focus:border-black focus:outline-none"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#717171] hover:text-black"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            aria-pressed={category === cat}
            onClick={() => setSelected(cat)}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
              category === cat ? 'border-black bg-black text-white' : 'border-[#EEEEEE] text-[#717171] hover:border-black hover:text-black'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {pickError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {pickError}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">No artwork matches your search.</p>
      ) : (
        <div className="grid min-h-0 grid-cols-2 content-start gap-3 overflow-y-auto pr-1 lg:flex-1">
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={pendingId !== null}
              onClick={() => pick(item)}
              title="Add to design"
              className="relative rounded-lg border border-[#EEEEEE] p-2 text-left hover:border-black disabled:cursor-wait"
            >
              <span className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-[#F5F5F5]">
                <img src={item.imageUrl} alt={item.title} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
              </span>
              <span className="mt-2 block truncate text-[11px] text-black">{item.title}</span>
              <span className="block truncate text-[10px] text-[#717171]">{item.category}</span>
              {pendingId === item.id && (
                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
                  <Loader2 className="h-5 w-5 animate-spin text-black" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
