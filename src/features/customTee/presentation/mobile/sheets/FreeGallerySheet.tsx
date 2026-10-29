'use client';

import { useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, X } from 'lucide-react';
import { ALL_CATEGORY, filterGallery, galleryCategories, type GalleryArtwork } from '../../../domain/gallery';
import { useGallery } from '../../../application/useGallery';
import { loadGalleryArtworkAsAsset } from '../../../application/galleryArtwork';

type Props = {
  onSelectArtwork: (artwork: { name: string; src: string; aspect: number }) => void;
};

export default function FreeGallerySheet({ onSelectArtwork }: Props) {
  const { items, loading, error, reload } = useGallery();
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const categories = useMemo(() => galleryCategories(items), [items]);
  const category = categories.includes(selectedCategory) ? selectedCategory : ALL_CATEGORY;
  const visible = useMemo(() => filterGallery(items, category, searchQuery), [items, category, searchQuery]);

  const pick = async (item: GalleryArtwork) => {
    if (pendingId) return;
    setPendingId(item.id);
    setPickError(null);
    try {
      onSelectArtwork(await loadGalleryArtworkAsAsset(item));
    } catch (err) {
      setPickError(err instanceof Error ? err.message : 'Could not load that artwork.');
    } finally {
      setPendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 pb-6" aria-busy="true" aria-label="Loading gallery">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-2.5">
            <div className="aspect-square w-full animate-pulse rounded-xl bg-zinc-100" />
            <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
        <p role="alert" className="text-xs text-red-600">{error}</p>
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-500">
        No artwork yet
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search designs..."
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-9 text-xs font-medium text-black placeholder-zinc-400 focus:border-black focus:bg-white focus:outline-none transition"
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isActive = category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold tracking-tight transition ${
                isActive ? 'bg-black text-white shadow-xs' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {pickError && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          {pickError}
        </p>
      )}

      {/* Artwork Grid */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-500">
          No artwork found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={pendingId !== null}
              onClick={() => pick(item)}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2.5 text-left shadow-2xs hover:border-black transition active:scale-98 disabled:cursor-wait"
            >
              <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-zinc-100 group-hover:scale-102 transition-transform">
                <img src={item.imageUrl} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-contain" />
              </div>
              <div className="mt-2 min-w-0">
                <span className="block truncate text-xs font-bold text-zinc-900">{item.title}</span>
                <span className="block truncate text-[10px] font-medium text-zinc-400">{item.category}</span>
              </div>
              {pendingId === item.id && (
                <span className="absolute inset-0 flex items-center justify-center bg-white/70">
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
