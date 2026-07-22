import { fetchAllProducts } from '../infrastructure/firestoreProductsRepository';
import type { Product } from '@/shared/domain/types';

export async function getProducts(): Promise<Product[]> {
  return fetchAllProducts();
}
