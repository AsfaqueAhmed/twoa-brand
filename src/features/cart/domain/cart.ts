import type { CartItem, Product, ProductVariant } from '@/shared/domain/types';
import { resolveAvailableStock } from '@/shared/domain/stock';

function matches(item: CartItem, productId: string, selectedSize?: string, selectedVariantId?: string): boolean {
  return (
    item.product.id === productId &&
    item.selectedSize === selectedSize &&
    item.selectedVariant?.id === selectedVariantId
  );
}

export function addItem(
  items: CartItem[],
  product: Product,
  quantity: number,
  selectedSize?: string,
  selectedVariant?: ProductVariant
): CartItem[] {
  const availableStock = resolveAvailableStock(product, selectedSize);
  if (availableStock <= 0) return items;

  const existingIndex = items.findIndex((item) => matches(item, product.id, selectedSize, selectedVariant?.id));
  if (existingIndex >= 0) {
    const existing = items[existingIndex];
    const newQty = Math.min(availableStock, existing.quantity + quantity);
    return items.map((item, i) => (i === existingIndex ? { ...item, quantity: newQty } : item));
  }
  return [...items, { product, quantity: Math.min(availableStock, quantity), selectedSize, selectedVariant }];
}

export function updateItemQuantity(
  items: CartItem[],
  productId: string,
  quantity: number,
  selectedSize: string | undefined,
  selectedVariant: ProductVariant | undefined,
  stock: number
): CartItem[] {
  if (quantity <= 0) {
    return removeItem(items, productId, selectedSize, selectedVariant);
  }
  return items.map((item) =>
    matches(item, productId, selectedSize, selectedVariant?.id)
      ? { ...item, quantity: Math.min(stock, quantity) }
      : item
  );
}

export function removeItem(
  items: CartItem[],
  productId: string,
  selectedSize?: string,
  selectedVariant?: ProductVariant
): CartItem[] {
  return items.filter((item) => !matches(item, productId, selectedSize, selectedVariant?.id));
}

export function computeSubtotal(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
}

export function computeCartCount(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.quantity, 0);
}

export function computeSavings(items: CartItem[]): number {
  return items.reduce((acc, { product, quantity }) => {
    const original = product.originalPrice;
    return original && original > product.price ? acc + (original - product.price) * quantity : acc;
  }, 0);
}

export function discountPercent(product: Product): number | undefined {
  const original = product.originalPrice;
  if (!original || original <= product.price) return undefined;
  return Math.round(((original - product.price) / original) * 100);
}

export function changeVariant(
  items: CartItem[],
  productId: string,
  selectedSize: string | undefined,
  oldVariant: ProductVariant | undefined,
  newVariant: ProductVariant
): CartItem[] {
  if (oldVariant?.id === newVariant.id) return items;
  const source = items.find((item) => matches(item, productId, selectedSize, oldVariant?.id));
  if (!source) return items;

  const target = items.find((item) => matches(item, productId, selectedSize, newVariant.id));
  if (!target) {
    return items.map((item) => (item === source ? { ...item, selectedVariant: newVariant } : item));
  }
  const stock = resolveAvailableStock(source.product, selectedSize);
  if (stock <= 0) return items;
  const mergedQty = Math.min(stock, target.quantity + source.quantity);
  return items
    .filter((item) => item !== source)
    .map((item) => (item === target ? { ...item, quantity: mergedQty } : item));
}
