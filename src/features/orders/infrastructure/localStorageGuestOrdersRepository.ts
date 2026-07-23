const STORAGE_KEY = 'swiftcart_guest_order_ids';

export function loadGuestOrderIds(): string[] {
  if (typeof window === 'undefined') return [];
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function addGuestOrderId(orderId: string): void {
  if (typeof window === 'undefined') return;
  const ids = loadGuestOrderIds();
  if (ids.includes(orderId)) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([orderId, ...ids]));
}
