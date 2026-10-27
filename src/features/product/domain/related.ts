import type { Product } from '@/shared/domain/types';

export function getRelatedProducts(candidates: Product[], currentId: string, limit: number): Product[] {
  if (limit <= 0) return [];
  return candidates.filter((product) => product.id !== currentId).slice(0, limit);
}
