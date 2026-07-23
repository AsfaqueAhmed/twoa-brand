import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { ProductVariant } from '@/shared/domain/types';

export interface ProductPayload {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number | null;
  image: string;
  category: string;
  subcategory: string;
  rating: number;
  parentProductId: string | null;
  variants: ProductVariant[];
  sizeChartId: string | null;
}

export async function saveProduct(payload: ProductPayload): Promise<void> {
  await setDoc(doc(db, 'products', payload.id), payload);
}

export async function deleteProduct(productId: string): Promise<void> {
  await deleteDoc(doc(db, 'products', productId));
}
