'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { PackageX, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '@/shared/domain/types';
import { getProductById } from '@/features/product/application/getProductById';
import { shouldLoadMore } from '@/features/product/domain/paginationTrigger';
import ProductDetailView from './ProductDetailView';
import Spinner from '@/shared/ui/Spinner';
import EmptyState from '@/shared/ui/EmptyState';

interface ProductModalContextValue {
  open: (product: Product, list?: Product[]) => void;
  close: () => void;
  syncList: (list: Product[]) => void;
  registerPagination: (hasMore: boolean, loadMore: () => void) => void;
}

const ProductModalContext = createContext<ProductModalContextValue | null>(null);

export function ProductModalProvider({ children }: { children: React.ReactNode }) {
  const [productId, setProductId] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [productList, setProductList] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pushedHistory, setPushedHistory] = useState(false);
  const paginationRef = useRef<{ hasMore: boolean; loadMore: () => void } | null>(null);

  const close = () => {
    if (pushedHistory) {
      window.history.back();
    } else {
      setProductId(null);
    }
    setProductList(null);
  };

  const open = (p: Product, list?: Product[]) => {
    window.history.pushState(null, '', `/product?id=${p.id}`);
    setPushedHistory(true);
    setProduct(p);
    setProductId(p.id);
    setProductList(list ?? null);
  };

  const syncList = useCallback((list: Product[]) => {
    setProductList((prev) => (prev ? list : prev));
  }, []);

  const registerPagination = useCallback((hasMore: boolean, loadMore: () => void) => {
    paginationRef.current = { hasMore, loadMore };
  }, []);

  const currentIndex = productList && productId ? productList.findIndex((p) => p.id === productId) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex !== -1 && productList !== null && currentIndex < productList.length - 1;
  const previousProduct = hasPrevious ? productList![currentIndex - 1] : undefined;
  const nextProduct = hasNext ? productList![currentIndex + 1] : undefined;
  const positionLabel =
    productList && currentIndex !== -1 ? { index: currentIndex + 1, total: productList.length } : undefined;

  const goToOffset = (offset: number) => {
    if (!productList || currentIndex === -1) return;
    const next = productList[currentIndex + offset];
    if (!next) return;
    window.history.replaceState(null, '', `/product?id=${next.id}`);
    setProduct(next);
    setProductId(next.id);
  };

  useEffect(() => {
    if (!productList || currentIndex === -1) return;
    const pagination = paginationRef.current;
    if (!pagination) return;
    if (shouldLoadMore(currentIndex, productList.length, pagination.hasMore)) {
      pagination.loadMore();
    }
  }, [currentIndex, productList]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const isProductUrl = window.location.pathname === '/product' && params.get('id');
      setPushedHistory(false);
      setProduct(null);
      setProductList(null);
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
    if (product && product.id === productId) return;
    setLoading(true);
    getProductById(productId).then((p) => {
      setProduct(p);
      setLoading(false);
    });
  }, [productId, product]);

  return (
    <ProductModalContext.Provider value={{ open, close, syncList, registerPagination }}>
      {children}
      {productId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
          {hasPrevious && (
            <button
              onClick={() => goToOffset(-1)}
              aria-label="Previous product"
              id="product-modal-prev-btn"
              className="fixed left-2 sm:left-6 top-1/2 -translate-y-1/2 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => goToOffset(1)}
              aria-label="Next product"
              id="product-modal-next-btn"
              className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
          <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-white overflow-y-auto overscroll-contain sm:overflow-hidden shadow-2xl">
            {loading ? (
              <div className="flex justify-center py-32">
                <Spinner />
              </div>
            ) : product ? (
              <ProductDetailView
                product={product}
                onClose={close}
                previousProduct={previousProduct}
                nextProduct={nextProduct}
                onNavigate={goToOffset}
                positionLabel={positionLabel}
              />
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
