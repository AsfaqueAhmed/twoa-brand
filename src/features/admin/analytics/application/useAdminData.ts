'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Order, Product } from '@/shared/domain/types';
import { fetchAllOrders } from '@/features/orders/infrastructure/firestoreOrdersRepository';
import { fetchAllProductsForAdmin } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import { fetchAllParentProducts } from '@/features/catalog/infrastructure/firestoreParentProductsRepository';

export function useAdminData(opts: { products?: boolean } = {}) {
  const withProducts = opts.products ?? false;
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [o, p, pp] = await Promise.all([
          fetchAllOrders(),
          withProducts ? fetchAllProductsForAdmin() : Promise.resolve([] as Product[]),
          withProducts ? fetchAllParentProducts() : Promise.resolve([]),
        ]);
        if (cancelled) return;
        const parentById = new Map(pp.map((x) => [x.id, x]));
        setOrders(o);
        setProducts(p.map((prod) => ({ ...prod, parentProduct: prod.parentProductId ? parentById.get(prod.parentProductId) : undefined })));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [withProducts, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { orders, products, loading, error, reload };
}
