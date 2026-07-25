import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { Product } from '@/shared/domain/types';

export type ProductsPageCursor = QueryDocumentSnapshot<DocumentData> | null;

export interface ProductsPage {
  products: Product[];
  cursor: ProductsPageCursor;
  hasMore: boolean;
}

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
    parentProductId: data.parentProductId || undefined,
    variants: data.variants || [],
    sizeChartId: data.sizeChartId || undefined,
  };
}

export async function fetchAllProducts(): Promise<Product[]> {
  const snapshot = await getDocs(collection(db, 'products'));
  return snapshot.docs.map((docSnap) => toProduct(docSnap.id, docSnap.data()));
}

export async function fetchProductsPage(
  pageSize: number,
  category: string | undefined,
  cursor: ProductsPageCursor
): Promise<ProductsPage> {
  const clauses = [];
  if (category && category !== 'All') clauses.push(where('category', '==', category));
  if (cursor) clauses.push(startAfter(cursor));
  clauses.push(limit(pageSize));

  const snap = await getDocs(query(collection(db, 'products'), ...clauses));
  return {
    products: snap.docs.map((docSnap) => toProduct(docSnap.id, docSnap.data())),
    cursor: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : cursor,
    hasMore: snap.docs.length === pageSize,
  };
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, 'products', id));
  if (!snap.exists()) return null;
  return toProduct(snap.id, snap.data());
}
