import type { Product } from './types';

export function resolveAvailableStock(product: Product, selectedSize?: string): number {
  if (!product.parentProduct || !selectedSize) return 0;
  return Math.max(0, product.parentProduct.stockBySize[selectedSize] ?? 0);
}

export function isProductOutOfStock(product: Product): boolean {
  if (!product.parentProduct) return true;
  const values = Object.values(product.parentProduct.stockBySize);
  return values.length === 0 || values.every((v) => v <= 0);
}
