'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/shared/domain/types';
import { shouldLoadMore } from '@/features/product/domain/paginationTrigger';

interface ProductNavigationContextValue {
  open: (product: Product, list?: Product[]) => void;
  close: () => void;
  syncList: (list: Product[]) => void;
  registerPagination: (hasMore: boolean, loadMore: () => void) => void;
}

interface InternalContextValue extends ProductNavigationContextValue {
  productList: Product[] | null;
  paginationRef: React.MutableRefObject<{ hasMore: boolean; loadMore: () => void } | null>;
}

const ProductNavigationContext = createContext<InternalContextValue | null>(null);

export function ProductNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [productList, setProductList] = useState<Product[] | null>(null);
  const paginationRef = useRef<{ hasMore: boolean; loadMore: () => void } | null>(null);
  const cameFromApp = useRef(false);

  const open = useCallback(
    (p: Product, list?: Product[]) => {
      setProductList(list ?? null);
      cameFromApp.current = true;
      router.push(`/product?id=${p.id}`);
    },
    [router],
  );

  const close = useCallback(() => {
    if (cameFromApp.current) {
      cameFromApp.current = false;
      router.back();
    } else {
      router.push('/');
    }
  }, [router]);

  const syncList = useCallback((list: Product[]) => {
    setProductList((prev) => (prev ? list : prev));
  }, []);

  const registerPagination = useCallback((hasMore: boolean, loadMore: () => void) => {
    paginationRef.current = { hasMore, loadMore };
  }, []);

  return (
    <ProductNavigationContext.Provider
      value={{ open, close, syncList, registerPagination, productList, paginationRef }}
    >
      {children}
    </ProductNavigationContext.Provider>
  );
}

function useInternal(): InternalContextValue {
  const ctx = useContext(ProductNavigationContext);
  if (!ctx) throw new Error('Product navigation hooks must be used within ProductNavigationProvider');
  return ctx;
}

export function useProductNavigation(): ProductNavigationContextValue {
  const { open, close, syncList, registerPagination } = useInternal();
  return { open, close, syncList, registerPagination };
}

export function useProductNeighbors(productId: string | null) {
  const router = useRouter();
  const { productList, paginationRef } = useInternal();

  const currentIndex = productList && productId ? productList.findIndex((p) => p.id === productId) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex !== -1 && productList !== null && currentIndex < productList.length - 1;
  const productFromList = currentIndex !== -1 ? productList![currentIndex] : undefined;
  const previousProduct = hasPrevious ? productList![currentIndex - 1] : undefined;
  const nextProduct = hasNext ? productList![currentIndex + 1] : undefined;
  const positionLabel =
    productList && currentIndex !== -1 ? { index: currentIndex + 1, total: productList.length } : undefined;

  const goToOffset = (offset: 1 | -1) => {
    const neighbor = offset === 1 ? nextProduct : previousProduct;
    if (!neighbor) return;
    router.replace(`/product?id=${neighbor.id}`);
  };

  useEffect(() => {
    if (!productList || currentIndex === -1) return;
    const pagination = paginationRef.current;
    if (!pagination) return;
    if (shouldLoadMore(currentIndex, productList.length, pagination.hasMore)) {
      pagination.loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, productList]);

  return { productFromList, previousProduct, nextProduct, positionLabel, goToOffset };
}
