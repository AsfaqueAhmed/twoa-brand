'use client';

import type { Product } from '@/shared/domain/types';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { useRelatedProducts } from '../application/useRelatedProducts';

interface RelatedProductsProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export default function RelatedProducts({ product, onSelect }: RelatedProductsProps) {
  const { related, loading } = useRelatedProducts(product);
  if (loading || related.length === 0) return null;

  return (
    <section className="mt-10" id="related-products">
      <h2 className="mb-4 text-lg font-bold text-black">You May Also Like</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {related.map((item) => {
          const hasDiscount = !!(item.originalPrice && item.originalPrice > item.price);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="group text-left"
              aria-label={item.name}
            >
              <div className="aspect-[4/5] overflow-hidden bg-[#F5F5F5]">
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <p className="mt-2 line-clamp-1 text-sm text-black">{item.name}</p>
              <p className="mt-0.5 flex items-baseline gap-2">
                <span className="text-sm font-bold text-black">{formatCurrency(item.price)}</span>
                {hasDiscount && (
                  <span className="font-mono text-[11px] text-[#919191] line-through">
                    {formatCurrency(item.originalPrice!)}
                  </span>
                )}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
