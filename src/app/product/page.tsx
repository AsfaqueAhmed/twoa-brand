'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PackageX } from 'lucide-react';
import type { Product } from '@/shared/domain/types';
import { getProductById } from '@/features/product/application/getProductById';
import ProductDetailView from '@/features/product/presentation/ProductDetailView';
import {
  useProductNavigation,
  useProductNeighbors,
} from '@/features/product/presentation/ProductNavigationProvider';
import Navbar from '@/features/catalog/presentation/Navbar';
import Spinner from '@/shared/ui/Spinner';
import EmptyState from '@/shared/ui/EmptyState';

function ProductPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  const { close } = useProductNavigation();
  const { productFromList, previousProduct, nextProduct, positionLabel, goToOffset } =
    useProductNeighbors(id);
  const [fetched, setFetched] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const hasListProduct = !!productFromList;

  useEffect(() => {
    if (!id) {
      setFetched(null);
      setLoading(false);
      return;
    }
    if (hasListProduct) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    getProductById(id).then((p) => {
      if (cancelled) return;
      setFetched(p);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, hasListProduct]);

  const product = productFromList ?? (fetched && fetched.id === id ? fetched : null);

  if (!product && loading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  if (!product) {
    return (
      <EmptyState
        icon={PackageX}
        title="Product not found"
        description="This product may have been removed, or the link is invalid."
      />
    );
  }

  return (
    <ProductDetailView
      key={product.id}
      product={product}
      onClose={close}
      previousProduct={previousProduct}
      nextProduct={nextProduct}
      onNavigate={goToOffset}
      positionLabel={positionLabel}
      onSelectRelated={(p) => router.replace(`/product?id=${p.id}`)}
    />
  );
}

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-0 sm:px-6 lg:px-8 pb-24 sm:pb-16">
        <Suspense fallback={<div className="flex justify-center py-32"><Spinner /></div>}>
          <ProductPageContent />
        </Suspense>
      </main>
    </div>
  );
}
