import type { User } from 'firebase/auth';
import type { CartItem } from '@/shared/domain/types';
import { createOrder } from '@/features/orders/infrastructure/firestoreOrdersRepository';
import { buildStockLines } from '../infrastructure/reserveParentStock';
import { computeDeliveryFeeByZone, computeTotal, generateOrderId } from '../domain/pricing';

export interface DeliveryDetails {
  name: string;
  phone: string;
  address: string;
  districtId?: string;
  cityCorpId?: string;
  thanaId?: string;
  promoCode?: string;
  discount?: number;
  finalTotal?: number;
}

export async function placeOrder(params: {
  user: User | null;
  cartItems: CartItem[];
  deliveryDetails: DeliveryDetails;
}): Promise<string> {
  const { user, cartItems, deliveryDetails } = params;
  const orderId = generateOrderId();

  const orderItemsPayload = cartItems.map((item) => {
    const orderItem: Record<string, any> = {
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      image_url: item.product.image,
    };
    if (item.selectedSize) orderItem.selectedSize = item.selectedSize;
    if (item.selectedVariant) {
      orderItem.selectedVariant = {
        id: item.selectedVariant.id,
        name: item.selectedVariant.name,
        colorCode: item.selectedVariant.colorCode ?? null,
        image_url: item.selectedVariant.image ?? null,
      };
    }
    if (item.product.parentProductId) orderItem.parentProductId = item.product.parentProductId;
    return orderItem;
  });

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const deliveryFee = computeDeliveryFeeByZone({
    districtId: deliveryDetails.districtId,
    cityCorpId: deliveryDetails.cityCorpId,
    thanaId: deliveryDetails.thanaId,
  });
  const computedTotal = computeTotal(subtotal, deliveryFee, deliveryDetails.discount ?? 0);
  const finalTotal = deliveryDetails.finalTotal !== undefined ? deliveryDetails.finalTotal : computedTotal;

  const cartLines = buildStockLines(cartItems);

  await createOrder(orderId, {
    userId: user ? user.uid : 'guest',
    userName: deliveryDetails.name,
    userEmail: user?.email || '',
    address: deliveryDetails.address,
    phone: deliveryDetails.phone,
    items: orderItemsPayload,
    totalAmount: finalTotal,
    promoCode: deliveryDetails.promoCode,
    discount: deliveryDetails.discount,
    cartLines,
  });

  return orderId;
}
