'use client';

import { useCatalogProducts } from '@/features/catalog/application/useCatalogProducts';
import CatalogGrid from '@/features/catalog/presentation/CatalogGrid';
import ProductCardSkeleton from '@/features/catalog/presentation/ProductCardSkeleton';
import { useHomeBanners } from '@/features/catalog/application/useHomeBanners';
import HeroCarousel from '@/features/catalog/presentation/HeroCarousel';
import TrustStrip from '@/features/catalog/presentation/TrustStrip';
import Navbar from '@/features/catalog/presentation/Navbar';

const SKELETON_CARD_COUNT = 8;

export default function HomePage() {
  const catalog = useCatalogProducts();
  const { banners } = useHomeBanners();

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans selection:bg-black selection:text-white">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <HeroCarousel banners={banners} />
        <TrustStrip />
        {catalog.loading ? (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-6">
              {Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : (
          <CatalogGrid {...catalog} />
        )}
      </main>
    </div>
  );
}
