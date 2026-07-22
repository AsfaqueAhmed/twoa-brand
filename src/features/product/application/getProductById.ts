import { fetchProductById } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import type { Product } from '@/shared/domain/types';

export async function getProductById(id: string): Promise<Product | null> {
  return fetchProductById(id);
}
