import { supabase } from '@/shared/infrastructure/supabase/client';
import type { Order, OrderItem, OrderStatus } from '@/shared/domain/types';
import type { StockLine } from '@/features/checkout/infrastructure/reserveParentStock';

function toOrderItem(item: Record<string, any>): OrderItem {
  const orderItem: OrderItem = {
    productId: item.productId,
    name: item.name,
    price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 0,
    image: item.image_url || '',
  };
  if (item.selectedSize) orderItem.selectedSize = item.selectedSize;
  if (item.selectedVariant) {
    orderItem.selectedVariant = {
      id: item.selectedVariant.id,
      name: item.selectedVariant.name,
      colorCode: item.selectedVariant.colorCode ?? undefined,
      image: item.selectedVariant.image_url || undefined,
    };
  }
  if (item.parentProductId) orderItem.parentProductId = item.parentProductId;
  return orderItem;
}

function toOrder(row: Record<string, any>): Order {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    address: row.address,
    phone: row.phone,
    items: Array.isArray(row.items) ? row.items.map(toOrderItem) : [],
    totalAmount: Number(row.total_amount) || 0,
    promoCode: row.promo_code ?? undefined,
    discount: row.discount != null ? Number(row.discount) : undefined,
    status: row.status,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateOrderPayload {
  userId: string;
  userName: string;
  userEmail: string;
  address: string;
  phone: string;
  items: Record<string, any>[];
  totalAmount: number;
  promoCode?: string;
  discount?: number;
  cartLines: StockLine[];
}

// Atomically reserves stock, inserts the order, and bumps coupon usage via
// the place_order RPC (supabase/migrations/20260802191915_init_schema.sql) —
// closes a gap in the old three-separate-Firestore-writes flow.
export async function createOrder(orderId: string, payload: CreateOrderPayload): Promise<void> {
  const { error } = await supabase.rpc('place_order', {
    p_order_id: orderId,
    p_user_id: payload.userId,
    p_user_name: payload.userName,
    p_user_email: payload.userEmail,
    p_address: payload.address,
    p_phone: payload.phone,
    p_items: payload.items,
    p_total_amount: payload.totalAmount,
    p_promo_code: payload.promoCode ?? null,
    p_discount: payload.discount ?? null,
    p_cart_lines: payload.cartLines,
  });
  if (error) throw new Error(error.message);
}

// Guest orders have no Supabase Auth identity, so they're only fetchable by
// their own (unguessable) ID via the get_guest_order RPC — mirrors
// Firestore's `allow get` (not `list`) rule, since Postgres RLS can't
// distinguish "fetch by known ID" from "list everything". This function's
// only caller (getGuestOrders.ts) only ever looks up guest-tracked IDs, so
// narrowing it to guest orders here matches actual usage.
export async function fetchOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase.rpc('get_guest_order', { p_order_id: orderId });
  if (error) throw new Error(error.message);
  return data && data.length > 0 ? toOrder(data[0]) : null;
}

export async function fetchOrdersForUser(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(toOrder);
}

export async function fetchAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(toOrder);
}

// Admin-only: goes through the orders_admin_write RLS policy, which allows a
// direct table UPDATE for the signed-in admin.
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw new Error(error.message);
}

// Customer/guest cancellation: RLS has no public UPDATE policy on orders at
// all, so this goes through the cancel_order RPC, which checks ownership
// and cancellable state server-side.
export async function cancelOrderAsCustomer(orderId: string, requesterUserId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId, p_requester_user_id: requesterUserId });
  if (error) throw new Error(error.message);
}
