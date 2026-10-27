import type { Order, Product } from '@/shared/domain/types';

export interface OrderImage {
  src: string;
  label: string;
}

export function itemThumbnails(productId: string, productsById?: Map<string, Product>, max = 3): string[] {
  const gallery = productsById?.get(productId)?.gallery;
  if (!gallery) return [];
  return gallery.filter((src) => !!src).slice(0, max);
}

export function buildOrderImages(order: Order, productsById?: Map<string, Product>): OrderImage[] {
  const seen = new Set<string>();
  const out: OrderImage[] = [];
  const add = (src: string | undefined, label: string) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    out.push({ src, label });
  };
  for (const item of order.items) {
    add(item.image, item.name);
    for (const src of productsById?.get(item.productId)?.gallery ?? []) add(src, item.name);
  }
  return out;
}
