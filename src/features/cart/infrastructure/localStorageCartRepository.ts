import type { CartItem } from '@/shared/domain/types';

const STORAGE_KEY = 'swiftcart_cart';

export function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
