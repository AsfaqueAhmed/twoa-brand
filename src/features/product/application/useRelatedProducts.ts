'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/shared/domain/types';
import { fetchProductsPage } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import { getRelatedProducts } from '../domain/related';

const RELATED_LIMIT = 4;

// Fetches one extra so the current product can be filtered out. A failure
// just means no related section — it must never break the product page.
export function useRelatedProducts(product: Product): { related: Product[]; loading: boolean } {
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProductsPage(RELATED_LIMIT + 1, product.category, undefined, null)
      .then((page) => {
        if (!cancelled) setRelated(getRelatedProducts(page.products, product.id, RELATED_LIMIT));
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id, product.category]);

  return { related, loading };
}
