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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function deliveryZoneLabel(fee: number): string {
  if (fee === 70) return 'Inside Dhaka City';
  if (fee === 110) return 'Dhaka Suburban';
  if (fee === 130) return 'Outside Dhaka';
  return 'Custom fee';
}

export function paymentStatus(status: OrderStatus): 'Unpaid' | 'Paid' | 'Void' {
  if (status === 'delivered') return 'Paid';
  if (status === 'cancelled') return 'Void';
  return 'Unpaid';
}

export function formatPlacedOn(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(h12)}:${pad(d.getMinutes())} ${hours < 12 ? 'AM' : 'PM'}`;
}

export function toggleSelected(selected: string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
}
