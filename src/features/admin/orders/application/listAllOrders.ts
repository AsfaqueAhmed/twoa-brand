import { fetchAllOrders } from '@/features/orders/infrastructure/firestoreOrdersRepository';
import type { Order } from '@/shared/domain/types';

export async function listAllOrders(): Promise<Order[]> {
  return fetchAllOrders();
}
