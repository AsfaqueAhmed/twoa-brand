import type { CartItem } from '@/shared/domain/types';

const STORAGE_KEY = 'swiftcart_cart';

export function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupted/stale value (e.g. from an old format or a bad write) — drop it
    // rather than crash the whole app on mount.
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
