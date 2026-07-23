'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { PackageX } from 'lucide-react';
import type { Product } from '@/shared/domain/types';
import { getProductById } from '@/features/product/application/getProductById';
import ProductDetailView from './ProductDetailView';
import Spinner from '@/shared/ui/Spinner';
import EmptyState from '@/shared/ui/EmptyState';

interface ProductModalContextValue {
  open: (id: string) => void;
  close: () => void;
}

const ProductModalContext = createContext<ProductModalContextValue | null>(null);

export function ProductModalProvider({ children }: { children: React.ReactNode }) {
  const [productId, setProductId] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [pushedHistory, setPushedHistory] = useState(false);

  const close = () => {
    if (pushedHistory) {
      window.history.back();
    } else {
      setProductId(null);
    }
  };

  const open = (id: string) => {
    window.history.pushState(null, '', `/product?id=${id}`);
    setPushedHistory(true);
    setProductId(id);
  };

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const isProductUrl = window.location.pathname === '/product' && params.get('id');
      setPushedHistory(false);
      setProductId(isProductUrl ? params.get('id') : null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      return;
    }
    setLoading(true);
    getProductById(productId).then((p) => {
      setProduct(p);
      setLoading(false);
    });
  }, [productId]);

  return (
    <ProductModalContext.Provider value={{ open, close }}>
      {children}
      {productId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
          <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-white overflow-y-auto overscroll-contain sm:overflow-hidden shadow-2xl">
            {loading ? (
              <div className="flex justify-center py-32">
                <Spinner />
              </div>
            ) : product ? (
              <ProductDetailView product={product} onClose={close} />
            ) : (
              <div className="p-8">
                <EmptyState
                  icon={PackageX}
                  title="Product not found"
                  description="This product may have been removed, or the link is invalid."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </ProductModalContext.Provider>
  );
}

export function useProductModal(): ProductModalContextValue {
  const ctx = useContext(ProductModalContext);
  if (!ctx) throw new Error('useProductModal must be used within ProductModalProvider');
  return ctx;
}
