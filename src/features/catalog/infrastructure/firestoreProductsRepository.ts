import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { Product } from '@/shared/domain/types';

function toProduct(id: string, data: Record<string, any>): Product {
  return {
    id,
    name: data.name || '',
    description: data.description || '',
    price: Number(data.price) || 0,
    originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
    image: data.image || '',
    category: data.category || '',
    subcategory: data.subcategory || '',
    rating: Number(data.rating) || 5,
    stock: Number(data.stock) || 0,
    sizes: data.sizes || [],
    variants: data.variants || [],
    sizeChartId: data.sizeChartId || undefined,
  };
}

export async function fetchAllProducts(): Promise<Product[]> {
  const snapshot = await getDocs(collection(db, 'products'));
  return snapshot.docs.map((docSnap) => toProduct(docSnap.id, docSnap.data()));
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, 'products', id));
  if (!snap.exists()) return null;
  return toProduct(snap.id, snap.data());
}

export async function updateProductStock(productId: string, nextStock: number): Promise<void> {
  await updateDoc(doc(db, 'products', productId), { stock: Math.max(0, nextStock) });
}
