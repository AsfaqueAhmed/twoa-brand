'use client';

import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/shared/domain/types';
import { filterProducts, getCategories, getSubcategories } from '../domain/filter';
import { useCart } from '@/features/cart/presentation/CartProvider';
import ProductCard from './ProductCard';
import EmptyState from '@/shared/ui/EmptyState';

export default function CatalogGrid({ initialProducts }: { initialProducts: Product[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const { addToCart } = useCart();
  const router = useRouter();

  const categories = getCategories(initialProducts);
  const subcategories = selectedCategory === 'All' ? [] : getSubcategories(initialProducts, selectedCategory);
  const filteredProducts = filterProducts(initialProducts, {
    search: searchQuery,
    category: selectedCategory,
    subcategory: selectedSubcategory,
  });

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
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedSubcategory('All');
              }}
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

      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No products match your query"
          description="Try adjusting search keywords or clearing department filter."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6" id="product-grid">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={(p) => router.push(`/product?id=${p.id}`)}
              onAddToCart={(p, e) => {
                e.stopPropagation();
                if ((p.sizes && p.sizes.length > 0) || (p.variants && p.variants.length > 0)) {
                  router.push(`/product?id=${p.id}`);
                } else {
                  addToCart(p, 1);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
