'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PackageX } from 'lucide-react';
import type { Product } from '@/shared/domain/types';
import { getProductById } from '@/features/product/application/getProductById';
import ProductDetailView from '@/features/product/presentation/ProductDetailView';
import Navbar from '@/features/catalog/presentation/Navbar';
import Spinner from '@/shared/ui/Spinner';
import EmptyState from '@/shared/ui/EmptyState';

function ProductPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getProductById(id).then((p) => {
      setProduct(p);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
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

  return <ProductDetailView product={product} />;
}

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8">
        <Suspense fallback={<div className="flex justify-center py-32"><Spinner /></div>}>
          <ProductPageContent />
        </Suspense>
      </main>
    </div>
  );
}
