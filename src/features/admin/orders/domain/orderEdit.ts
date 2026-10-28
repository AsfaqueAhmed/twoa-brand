import type { Order, Product } from '@/shared/domain/types';
import type { DraftLine } from '@/features/admin/createOrder/domain/adminOrder';

// Turns a saved order back into editable draft lines. Catalog lines keep the
// order's historical price but use the live product so stock caps are current.
export function orderToDraftLines(order: Order, products: Product[]): DraftLine[] {
  return order.items.map((item): DraftLine => {
    if (item.productId.startsWith('custom_')) {
      return { kind: 'custom', id: item.productId, name: item.name, price: item.price, quantity: item.quantity };
    }
    const live = products.find((p) => p.id === item.productId);
    const product: Product = live
      ? {
          // Rebuild from the order line's historical data (price, name, image, parent) so legacy
          // lines stay non-stock-bearing and a re-parented live product can't cause stock side
          // effects; the live parentProduct is kept only when the parent is unchanged (stock caps).
          ...live, price: item.price, name: item.name, image: item.image,
          parentProductId: item.parentProductId,
          parentProduct: live.parentProductId === item.parentProductId ? live.parentProduct : undefined,
        }
      : {
          id: item.productId, name: item.name, description: '', price: item.price, image: item.image,
          category: '', rating: 0, parentProductId: item.parentProductId,
        };
    return {
      kind: 'catalog',
      item: { product, quantity: item.quantity, selectedSize: item.selectedSize, selectedVariant: item.selectedVariant },
    };
  });
}
