'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ParentProduct, Product } from '@/shared/domain/types';
import { fetchAllParentProducts } from '@/features/catalog/infrastructure/firestoreParentProductsRepository';
import { fetchAllProducts } from '@/features/catalog/infrastructure/firestoreProductsRepository';

export function useCustomTeeData() {
  const [parents, setParents] = useState<ParentProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAllParentProducts(), fetchAllProducts()])
      .then(([pp, prods]) => {
        if (cancelled) return;
        setParents(pp);
        setProducts(prods);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not load tees. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-reads stock; used before opening the studio and before saving.
  const refreshParents = useCallback(async () => {
    const fresh = await fetchAllParentProducts();
    setParents(fresh);
    return fresh;
  }, []);

  return { parents, products, loading, error, refreshParents };
}
