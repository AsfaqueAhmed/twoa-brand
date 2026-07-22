import { fetchOrdersForUser } from '../infrastructure/firestoreOrdersRepository';
import type { Order } from '@/shared/domain/types';

export async function getUserOrders(userId: string): Promise<Order[]> {
  return fetchOrdersForUser(userId);
}
