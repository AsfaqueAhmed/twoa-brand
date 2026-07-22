import { updateOrderStatus as updateOrderStatusInFirestore } from '../infrastructure/firestoreOrdersRepository';
import type { OrderStatus } from '@/shared/domain/types';

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  await updateOrderStatusInFirestore(orderId, status);
}
