export const FREE_DELIVERY_THRESHOLD = 100;
export const DELIVERY_FEE = 4.99;

export function computeDeliveryFee(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

export function computeTotal(subtotal: number, deliveryFee: number, discount = 0): number {
  return Math.round((subtotal + deliveryFee - discount) * 100) / 100;
}

export function generateOrderId(): string {
  const randomHex = Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `ord_${randomHex}`;
}
