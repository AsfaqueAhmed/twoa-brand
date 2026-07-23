import { collection, doc, setDoc, updateDoc, getDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { Order, OrderStatus } from '@/shared/domain/types';

function toOrder(id: string, data: Record<string, any>): Order {
  const createdAtISO = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString();
  const updatedAtISO = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString();
  return {
    id,
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    address: data.address,
    phone: data.phone,
    items: data.items,
    totalAmount: data.totalAmount,
    promoCode: data.promoCode,
    discount: data.discount,
    status: data.status,
    paymentMethod: data.paymentMethod,
    createdAt: createdAtISO,
    updatedAt: updatedAtISO,
  };
}

export async function createOrder(orderId: string, payload: Record<string, any>): Promise<void> {
  await setDoc(doc(db, 'orders', orderId), {
    ...payload,
    id: orderId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Single-document fetch by ID — matches the Firestore `allow get` rule that lets
// a guest order be read by anyone who knows its (unguessable) ID, without
// granting `list` access to enumerate the collection.
export async function fetchOrderById(orderId: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists()) return null;
  return toOrder(snap.id, snap.data());
}

export async function fetchOrdersForUser(userId: string): Promise<Order[]> {
  const q = query(collection(db, 'orders'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const orders = snapshot.docs.map((docSnap) => toOrder(docSnap.id, docSnap.data()));
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return orders;
}

export async function fetchAllOrders(): Promise<Order[]> {
  const snapshot = await getDocs(collection(db, 'orders'));
  const orders = snapshot.docs.map((docSnap) => toOrder(docSnap.id, docSnap.data()));
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return orders;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), { status, updatedAt: serverTimestamp() });
}
