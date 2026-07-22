import type { User } from 'firebase/auth';
import type { CartItem, OrderItem, OrderStatus } from '@/shared/domain/types';
import { createOrder } from '@/features/orders/infrastructure/firestoreOrdersRepository';
import { updateProductStock } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import { computeDeliveryFee, computeTotal, generateOrderId } from '../domain/pricing';

export interface DeliveryDetails {
  name: string;
  phone: string;
  address: string;
  promoCode?: string;
  discount?: number;
  finalTotal?: number;
}

export async function placeOrder(params: {
  user: User;
  cartItems: CartItem[];
  deliveryDetails: DeliveryDetails;
}): Promise<string> {
  const { user, cartItems, deliveryDetails } = params;
  const orderId = generateOrderId();

  const orderItemsPayload: OrderItem[] = cartItems.map((item) => ({
    productId: item.product.id,
    name: item.product.name,
    price: item.product.price,
    quantity: item.quantity,
    image: item.product.image,
    selectedSize: item.selectedSize || undefined,
    selectedVariant: item.selectedVariant || undefined,
  }));

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const deliveryFee = computeDeliveryFee(subtotal);
  const computedTotal = computeTotal(subtotal, deliveryFee, deliveryDetails.discount ?? 0);
  const finalTotal = deliveryDetails.finalTotal !== undefined ? deliveryDetails.finalTotal : computedTotal;

  const payload: Record<string, any> = {
    userId: user.uid,
    userName: deliveryDetails.name,
    userEmail: user.email || '',
    address: deliveryDetails.address,
    phone: deliveryDetails.phone,
    items: orderItemsPayload,
    totalAmount: finalTotal,
    status: 'pending' as OrderStatus,
    paymentMethod: 'cash_on_delivery' as const,
  };
  if (deliveryDetails.promoCode) payload.promoCode = deliveryDetails.promoCode;
  if (deliveryDetails.discount !== undefined) payload.discount = deliveryDetails.discount;

  await createOrder(orderId, payload);

  for (const item of cartItems) {
    const nextStock = Math.max(0, item.product.stock - item.quantity);
    await updateProductStock(item.product.id, nextStock);
  }

  return orderId;
}
