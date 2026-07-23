import type { Order } from '@/shared/domain/types';
import { fetchOrderById } from '../infrastructure/firestoreOrdersRepository';
import { loadGuestOrderIds } from '../infrastructure/localStorageGuestOrdersRepository';

export async function getGuestOrders(): Promise<Order[]> {
  const ids = loadGuestOrderIds();
  const results = await Promise.all(ids.map((id) => fetchOrderById(id).catch(() => null)));
  const orders = results.filter((o): o is Order => o !== null);
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return orders;
}
