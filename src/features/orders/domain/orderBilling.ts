import type { Order } from '@/shared/domain/types';

export interface OrderBilling {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

// Orders store only the final total, so shipping is whatever is left after
// the items and discount are accounted for.
export function computeOrderBilling(order: Pick<Order, 'items' | 'discount' | 'totalAmount'>): OrderBilling {
  const subtotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = order.discount ?? 0;
  const shipping = Math.max(0, Math.round((order.totalAmount - (subtotal - discount)) * 100) / 100);
  return { subtotal, discount, shipping, total: order.totalAmount };
}

export function orderNumber(orderId: string): string {
  return orderId.slice(-8).toUpperCase();
}
