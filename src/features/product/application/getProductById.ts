import { fetchProductById } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import { fetchParentProductById } from '@/features/catalog/infrastructure/firestoreParentProductsRepository';
import type { Product } from '@/shared/domain/types';

export async function getProductById(id: string): Promise<Product | null> {
  const product = await fetchProductById(id);
  if (!product) return null;
  if (!product.parentProductId) return product;
  const parentProduct = await fetchParentProductById(product.parentProductId);
  return { ...product, parentProduct: parentProduct ?? undefined };
}
