import { updateOrderStatus } from '@/features/orders/infrastructure/firestoreOrdersRepository';
import type { OrderStatus } from '@/shared/domain/types';

export async function updateOrderStatusAsAdmin(orderId: string, status: OrderStatus): Promise<void> {
  await updateOrderStatus(orderId, status);
}
