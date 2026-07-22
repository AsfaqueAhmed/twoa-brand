import { updateOrderStatus } from '../infrastructure/firestoreOrdersRepository';

export async function cancelOrder(orderId: string): Promise<void> {
  await updateOrderStatus(orderId, 'cancelled');
}
