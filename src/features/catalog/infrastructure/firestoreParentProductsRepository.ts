import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { ParentProduct } from '@/shared/domain/types';

async function assembleParentProduct(id: string, data: Record<string, any>): Promise<ParentProduct> {
  const sizeOrder: string[] = Array.isArray(data.sizeOrder) ? data.sizeOrder : [];
  const sizeStockSnap = await getDocs(collection(db, 'parentProducts', id, 'sizeStock'));
  const stockByDocId = new Map(sizeStockSnap.docs.map((d) => [d.id, Number(d.data().stock) || 0]));
  const stockBySize: Record<string, number> = {};
  for (const size of sizeOrder) {
    stockBySize[size] = stockByDocId.get(size) ?? 0;
  }
  return { id, name: data.name || '', sizeOrder, stockBySize };
}

export async function fetchParentProductById(id: string): Promise<ParentProduct | null> {
  const snap = await getDoc(doc(db, 'parentProducts', id));
  if (!snap.exists()) return null;
  return assembleParentProduct(snap.id, snap.data());
}

export async function fetchAllParentProducts(): Promise<ParentProduct[]> {
  const snap = await getDocs(collection(db, 'parentProducts'));
  return Promise.all(snap.docs.map((d) => assembleParentProduct(d.id, d.data())));
}
