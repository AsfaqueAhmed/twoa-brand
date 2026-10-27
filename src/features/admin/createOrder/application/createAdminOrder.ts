import type { OrderStatus } from '@/shared/domain/types';
import { createOrder } from '@/features/orders/infrastructure/firestoreOrdersRepository';
import { generateOrderId } from '@/features/checkout/domain/pricing';
import { updateOrderStatusAsAdmin } from '@/features/admin/orders/application/updateOrderStatusAsAdmin';
import { buildAdminOrderItems, type DraftLine } from '../domain/adminOrder';

export async function createAdminOrder(params: {
  name: string;
  phone: string;
  address: string;
  lines: DraftLine[];
  total: number;
  promoCode?: string;
  discount?: number;
  status: OrderStatus;
}): Promise<string> {
  const orderId = generateOrderId();
  const { items, cartLines } = buildAdminOrderItems(params.lines);
  await createOrder(orderId, {
    userId: 'guest',
    userName: params.name.trim(),
    userEmail: '',
    address: params.address,
    phone: params.phone.trim(),
    items,
    totalAmount: params.total,
    promoCode: params.promoCode,
    discount: params.discount && params.discount > 0 ? params.discount : undefined,
    cartLines,
  });
  if (params.status !== 'pending') {
    try {
      await updateOrderStatusAsAdmin(orderId, params.status);
    } catch {
      throw new Error(`Order #${orderId.slice(-8)} was created but setting its status failed — change it from All Orders.`);
    }
  }
  return orderId;
}
