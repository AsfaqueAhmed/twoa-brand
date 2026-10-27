import { fetchAllProducts } from '../infrastructure/firestoreProductsRepository';
import { fetchAllParentProducts } from '../infrastructure/firestoreParentProductsRepository';
import type { Product } from '@/shared/domain/types';
import { isProductOutOfStock } from '@/shared/domain/stock';

export async function getProducts(): Promise<Product[]> {
  const [products, parentProducts] = await Promise.all([fetchAllProducts(), fetchAllParentProducts()]);
  const parentById = new Map(parentProducts.map((pp) => [pp.id, pp]));
  // Only used for search results, which — like the paged catalog — hide out-of-stock products.
  return products
    .map((product) => ({
      ...product,
      parentProduct: product.parentProductId ? parentById.get(product.parentProductId) : undefined,
    }))
    .filter((product) => !isProductOutOfStock(product));
}
