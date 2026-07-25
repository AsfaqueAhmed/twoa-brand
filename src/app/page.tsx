'use client';

import { useCatalogProducts } from '@/features/catalog/application/useCatalogProducts';
import CatalogGrid from '@/features/catalog/presentation/CatalogGrid';
import Navbar from '@/features/catalog/presentation/Navbar';
import Spinner from '@/shared/ui/Spinner';

export default function HomePage() {
  const catalog = useCatalogProducts();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-black selection:text-white">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        {catalog.loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Spinner />
            <span className="mt-4 text-xs font-bold uppercase tracking-widest text-[#717171]">
              Synchronizing products with Firestore...
            </span>
          </div>
        ) : (
          <CatalogGrid {...catalog} />
        )}
      </main>
    </div>
  );
}
