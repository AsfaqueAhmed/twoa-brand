'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/shared/domain/types';
import { getProducts } from '@/features/catalog/application/getProducts';
import CatalogGrid from '@/features/catalog/presentation/CatalogGrid';
import Navbar from '@/features/catalog/presentation/Navbar';
import Spinner from '@/shared/ui/Spinner';
import { shuffleArray } from '@/shared/lib/shuffleArray';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    getProducts()
      .then((fetched) => setProducts(shuffleArray(fetched)))
      .finally(() => setProductsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-black selection:text-white">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        {productsLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Spinner />
            <span className="mt-4 text-xs font-bold uppercase tracking-widest text-[#717171]">
              Synchronizing products with Firestore...
            </span>
          </div>
        ) : (
          <CatalogGrid initialProducts={products} />
        )}
      </main>
    </div>
  );
}
