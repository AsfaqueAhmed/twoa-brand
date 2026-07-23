import { fetchAllProducts } from '../infrastructure/firestoreProductsRepository';
import { fetchAllParentProducts } from '../infrastructure/firestoreParentProductsRepository';
import type { Product } from '@/shared/domain/types';

export async function getProducts(): Promise<Product[]> {
  const [products, parentProducts] = await Promise.all([fetchAllProducts(), fetchAllParentProducts()]);
  const parentById = new Map(parentProducts.map((pp) => [pp.id, pp]));
  return products.map((product) => ({
    ...product,
    parentProduct: product.parentProductId ? parentById.get(product.parentProductId) : undefined,
  }));
}
