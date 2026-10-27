import type { CartItem } from '@/shared/domain/types';

// The per-line JSON stored in orders.items (and read back by toOrderItem in
// the orders repository). Shared by storefront checkout and admin order entry.
export function buildOrderItemPayload(item: CartItem): Record<string, any> {
  const orderItem: Record<string, any> = {
    productId: item.product.id,
    name: item.product.name,
    price: item.product.price,
    quantity: item.quantity,
    image_url: item.product.image,
  };
  if (item.selectedSize) orderItem.selectedSize = item.selectedSize;
  if (item.selectedVariant) {
    orderItem.selectedVariant = {
      id: item.selectedVariant.id,
      name: item.selectedVariant.name,
      colorCode: item.selectedVariant.colorCode ?? null,
      image_url: item.selectedVariant.image ?? null,
    };
  }
  if (item.product.parentProductId) orderItem.parentProductId = item.product.parentProductId;
  return orderItem;
}
