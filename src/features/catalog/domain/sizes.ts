import type { Product } from '@/shared/domain/types';

export function getInStockSizes(product: Product): string[] {
  const parent = product.parentProduct;
  if (!parent) return [];
  return parent.sizeOrder.filter((size) => (parent.stockBySize[size] ?? 0) > 0);
}

export function getDefaultSize(product: Product): string | undefined {
  return getInStockSizes(product)[0];
}
