'use client';

import { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6" id="shop-catalog-section">
      <div className="mb-4 flex items-center gap-3 overflow-x-auto pb-1" id="category-selector">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 rounded-full px-6 py-2.5 text-xs font-bold tracking-wide transition-all duration-200 border ${
              selectedCategory === cat
                ? 'bg-black text-white border-black'
                : 'bg-white border-[#E4E1DA] text-black hover:border-black'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {selectedCategory !== 'All' && subcategories.length > 1 && (
        <div
          className="mb-8 flex items-center gap-2 overflow-x-auto rounded-full bg-[#F0EEE9] p-1.5 animate-in fade-in duration-200"
          id="subcategory-selector"
        >
          {subcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubcategory(sub)}
              className={`shrink-0 rounded-full px-5 py-2 text-xs font-semibold transition-all duration-200 ${
                selectedSubcategory === sub ? 'bg-black text-white' : 'text-[#4A4A4A] hover:text-black'
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
          description="Try a different category."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6" id="product-grid">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={(p) => open(p, visibleProducts)}
                onAddToCart={(p, size, variant, e) => {
                  e.stopPropagation();
                  addToCart(p, 1, size, variant);
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
