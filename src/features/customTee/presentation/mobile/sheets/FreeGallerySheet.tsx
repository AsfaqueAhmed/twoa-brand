'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  GALLERY_CATEGORIES,
  type GalleryCategory,
  type GalleryItem,
  filterGalleryByCategory,
} from '../galleryData';

type Props = {
  onSelectArtwork: (artwork: { name: string; src: string; aspect: number }) => void;
};

export default function FreeGallerySheet({ onSelectArtwork }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const items = useMemo(() => {
    return filterGalleryByCategory(selectedCategory, searchQuery);
  }, [selectedCategory, searchQuery]);

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
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {GALLERY_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold tracking-tight transition ${
                isActive
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Artwork Grid */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-500">
          No artwork found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectArtwork({ name: item.title, src: item.src, aspect: item.aspect })}
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2.5 text-left shadow-2xs hover:border-black transition active:scale-98"
            >
              <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-zinc-100 group-hover:scale-102 transition-transform">
                <img src={item.src} alt={item.title} className="h-full w-full object-contain" />
              </div>
              <div className="mt-2 min-w-0">
                <span className="block truncate text-xs font-bold text-zinc-900">{item.title}</span>
                <span className="block text-[10px] font-medium text-zinc-400 capitalize">{item.category}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
