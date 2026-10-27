import type { Order, OrderStatus } from '@/shared/domain/types';

export function shortOrderId(id: string): string {
  return `#${id.slice(-8)}`;
}

export function orderItemCount(order: Order): number {
  return order.items.reduce((n, i) => n + i.quantity, 0);
}

export function orderBreakdown(order: Order): { subtotal: number; discount: number; deliveryFee: number; total: number } {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = order.discount ?? 0;
  const deliveryFee = Math.max(0, Math.round((order.totalAmount - subtotal + discount) * 100) / 100);
  return { subtotal, discount, deliveryFee, total: order.totalAmount };
}

export function canEditItems(status: OrderStatus): boolean {
  return status === 'pending' || status === 'confirmed';
}
