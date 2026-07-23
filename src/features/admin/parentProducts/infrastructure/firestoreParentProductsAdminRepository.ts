import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { ParentProduct } from '@/shared/domain/types';
import { fetchAllParentProducts } from '@/features/catalog/infrastructure/firestoreParentProductsRepository';

export async function fetchParentProducts(): Promise<ParentProduct[]> {
  return fetchAllParentProducts();
}

export async function saveParentProduct(pp: ParentProduct, previousSizeOrder: string[]): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'parentProducts', pp.id), { name: pp.name, sizeOrder: pp.sizeOrder });

  for (const size of pp.sizeOrder) {
    batch.set(doc(db, 'parentProducts', pp.id, 'sizeStock', size), { stock: Number(pp.stockBySize[size]) || 0 });
  }

  const removedSizes = previousSizeOrder.filter((size) => !pp.sizeOrder.includes(size));
  for (const size of removedSizes) {
    batch.delete(doc(db, 'parentProducts', pp.id, 'sizeStock', size));
  }

  await batch.commit();
}

export async function deleteParentProduct(id: string, sizeOrder: string[]): Promise<void> {
  const linkedProducts = await getDocs(query(collection(db, 'products'), where('parentProductId', '==', id)));
  if (!linkedProducts.empty) {
    throw new Error(
      `Cannot delete: ${linkedProducts.size} product(s) still reference this Parent Product. Unlink them first.`
    );
  }

  const batch = writeBatch(db);
  for (const size of sizeOrder) {
    batch.delete(doc(db, 'parentProducts', id, 'sizeStock', size));
  }
  batch.delete(doc(db, 'parentProducts', id));
  await batch.commit();
}
