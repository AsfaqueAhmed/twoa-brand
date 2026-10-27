'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { PackageX } from 'lucide-react';
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

  const navigateTo = (next: Product) => {
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
        // Full-screen product page layered under the sticky navbar (z-40) and
        // mobile bottom nav, so it reads as a page, not a popup.
        <div className="fixed inset-x-0 bottom-0 top-20 z-30 bg-[#FAF9F6]" id="product-page-overlay">
          <div className="mx-auto h-full w-full max-w-7xl pb-16 sm:pb-0">
            {loading ? (
              <div className="flex justify-center py-32">
                <Spinner />
              </div>
            ) : product ? (
              <ProductDetailView
                key={product.id}
                product={product}
                onClose={close}
                previousProduct={previousProduct}
                nextProduct={nextProduct}
                onNavigate={goToOffset}
                positionLabel={positionLabel}
                onSelectRelated={navigateTo}
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
