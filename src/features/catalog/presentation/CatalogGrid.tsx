'use client';

import { useEffect, useRef } from 'react';
import { Search, Sparkles } from 'lucide-react';
import type { Product } from '@/shared/domain/types';
import { useCart } from '@/features/cart/presentation/CartProvider';
import { useProductModal } from '@/features/product/presentation/ProductModalProvider';
import ProductCard from './ProductCard';
import ProductCardSkeleton from './ProductCardSkeleton';
import EmptyState from '@/shared/ui/EmptyState';
import Spinner from '@/shared/ui/Spinner';

const SKELETON_CARD_COUNT = 8;

export interface CatalogGridProps {
  visibleProducts: Product[];
  categories: string[];
  subcategories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (subcategory: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resultsLoading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
}

export default function CatalogGrid({
  visibleProducts,
  categories,
  subcategories,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  searchQuery,
  setSearchQuery,
  resultsLoading,
  hasMore,
  loadingMore,
  loadMore,
}: CatalogGridProps) {
  const { addToCart } = useCart();
  const { open, syncList, registerPagination } = useProductModal();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Keep a ref to the latest loadMore so the observer (created once) always
  // triggers current behavior — recreating the observer on every loadMore
  // identity change caused it to re-observe an already-visible sentinel,
  // which fires an immediate duplicate intersection callback and led to
  // runaway duplicate page fetches.
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current();
      },
      { rootMargin: '400px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncList(visibleProducts);
  }, [visibleProducts, syncList]);

  useEffect(() => {
    registerPagination(hasMore, loadMore);
  }, [hasMore, loadMore, registerPagination]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8" id="shop-catalog-section">
      <div className="relative overflow-hidden rounded-none bg-black text-white p-8 sm:p-12 mb-10 border border-black">
        <div className="relative z-10 max-w-xl space-y-4">
          <span className="inline-flex items-center space-x-1.5 border border-white/20 bg-white/5 text-white text-[9px] font-bold px-3 py-1 uppercase tracking-[0.2em]">
            <Sparkles className="h-3 w-3" />
            <span>100% Risk-Free Shopping</span>
          </span>
          <h2 className="text-xl sm:text-3xl font-bold uppercase tracking-[0.15em] leading-snug">
            Premium Quality, Paid on Delivery
          </h2>
          <p className="text-xs sm:text-sm text-[#A1A1A1] leading-relaxed">
            Browse elite, curated productivity and lifestyle hardware accessories. Hand over cash only after
            successfully receiving and reviewing your package items.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="relative max-w-md w-full">
          <Search className="absolute top-3.5 left-4 h-4.5 w-4.5 text-[#717171]" />
          <input
            type="text"
            placeholder="Search catalog products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-none border border-[#EEEEEE] bg-white py-3.5 pl-11 pr-4 text-xs font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none transition-colors"
            id="catalog-search"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-full" id="category-selector">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-none px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
                selectedCategory === cat
                  ? 'bg-black text-white border-black'
                  : 'bg-white border-[#EEEEEE] text-[#717171] hover:border-black hover:text-black'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {selectedCategory !== 'All' && subcategories.length > 1 && (
        <div
          className="flex flex-wrap items-center gap-2 mb-8 bg-[#FAF9F6] p-4 border border-[#EEEEEE] animate-in fade-in duration-200"
          id="subcategory-selector"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#717171] mr-2">Subcategories:</span>
          {subcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubcategory(sub)}
              className={`rounded-none px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border ${
                selectedSubcategory === sub
                  ? 'bg-black text-white border-black'
                  : 'bg-white border-[#EEEEEE] text-[#717171] hover:border-black hover:text-black'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {resultsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : visibleProducts.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No products match your query"
          description="Try adjusting search keywords or clearing department filter."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6" id="product-grid">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={(p) => open(p, visibleProducts)}
                onAddToCart={(p, e) => {
                  e.stopPropagation();
                  const sizeOrder = p.parentProduct?.sizeOrder ?? [];
                  if (sizeOrder.length === 1 && !(p.variants && p.variants.length > 0)) {
                    addToCart(p, 1, sizeOrder[0]);
                  } else {
                    open(p, visibleProducts);
                  }
                }}
              />
            ))}
          </div>
          <div ref={sentinelRef} className="flex justify-center py-10">
            {loadingMore && <Spinner />}
          </div>
        </>
      )}
    </div>
  );
}
