import type { CartItem, Product } from '@/shared/domain/types';
import { isProductOutOfStock } from '@/shared/domain/stock';

export function pickRecommendations(all: Product[], cartItems: CartItem[], limit = 6): Product[] {
  const inCart = new Set(cartItems.map((item) => item.product.id));
  const categories = new Set(cartItems.map((item) => item.product.category));
  const candidates = all.filter((p) => !inCart.has(p.id) && !isProductOutOfStock(p));

  const byRating = (a: Product, b: Product) => b.rating - a.rating;
  const sameCategory = candidates.filter((p) => categories.has(p.category)).sort(byRating);
  const others = candidates.filter((p) => !categories.has(p.category)).sort(byRating);
  return [...sameCategory, ...others].slice(0, limit);
}
