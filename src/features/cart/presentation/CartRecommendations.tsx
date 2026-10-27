'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Product } from '@/shared/domain/types';
import { getProducts } from '@/features/catalog/application/getProducts';
import { useProductModal } from '@/features/product/presentation/ProductModalProvider';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { discountPercent } from '../domain/cart';
import { pickRecommendations } from '../domain/recommendations';
import { useCart } from './CartProvider';

export default function CartRecommendations() {
  const { items } = useCart();
  const { open } = useProductModal();
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    getProducts()
      .then((products) => {
        if (!cancelled) setAllProducts(products);
      })
      .catch(() => {
        // Recommendations are optional; the cart works without them.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recommendations = pickRecommendations(allProducts, items);
  if (recommendations.length === 0) return null;

  return (
    <section className="space-y-4" id="cart-recommendations">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-black">You May Also Like</h2>
        <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-black hover:underline">
          View All <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {recommendations.map((p) => {
          const percent = discountPercent(p);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => open(p, recommendations)}
              className="text-left space-y-2"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#F5F5F5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                {percent !== undefined && (
                  <span className="absolute top-2 left-2 bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    {percent}% off
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-black truncate">{p.name}</p>
              <p className="text-sm font-bold text-black">
                {formatCurrency(p.price)}
                {percent !== undefined && (
                  <span className="ml-2 text-xs font-normal text-[#717171] line-through">
                    {formatCurrency(p.originalPrice!)}
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
