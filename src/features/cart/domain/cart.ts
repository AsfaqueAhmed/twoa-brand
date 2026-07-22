import type { CartItem, Product, ProductVariant } from '@/shared/domain/types';

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
  const existingIndex = items.findIndex((item) => matches(item, product.id, selectedSize, selectedVariant?.id));
  if (existingIndex >= 0) {
    const existing = items[existingIndex];
    const newQty = Math.min(product.stock, existing.quantity + quantity);
    return items.map((item, i) => (i === existingIndex ? { ...item, quantity: newQty } : item));
  }
  return [...items, { product, quantity: Math.min(product.stock, quantity), selectedSize, selectedVariant }];
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
