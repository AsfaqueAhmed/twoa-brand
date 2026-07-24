import type { Product } from '@/shared/domain/types';

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

function fire(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', event, params);
}

export function pixelPageView() {
  fire('PageView');
}

export function pixelViewContent(product: Product) {
  fire('ViewContent', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    value: product.price,
    currency: 'BDT',
  });
}

export function pixelAddToCart(product: Product, quantity: number, selectedSize?: string) {
  fire('AddToCart', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    contents: [{ id: product.id, quantity, item_price: product.price, ...(selectedSize ? { variant: selectedSize } : {}) }],
    value: product.price * quantity,
    currency: 'BDT',
  });
}

export function pixelPurchase(params: { orderId: string; value: number; contentIds: string[] }) {
  fire('Purchase', {
    content_ids: params.contentIds,
    content_type: 'product',
    value: params.value,
    currency: 'BDT',
    order_id: params.orderId,
  });
}
