import type { Order } from '@/shared/domain/types';
import { fetchOrderByNumberAndPhone } from '../infrastructure/firestoreOrdersRepository';

export async function trackOrder(orderNumber: string, phone: string): Promise<Order> {
  const cleanNumber = orderNumber.trim().replace(/^#/, '');
  if (!cleanNumber || !phone.trim()) throw new Error('Please enter both your order number and phone number.');
  const order = await fetchOrderByNumberAndPhone(cleanNumber, phone);
  if (!order) throw new Error('No order found. Please check your order number and phone number.');
  return order;
}
