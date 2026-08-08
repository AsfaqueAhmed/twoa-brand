import { cancelOrderAsCustomer } from '../infrastructure/firestoreOrdersRepository';

export async function cancelOrder(orderId: string, userId: string): Promise<void> {
  await cancelOrderAsCustomer(orderId, userId);
}
