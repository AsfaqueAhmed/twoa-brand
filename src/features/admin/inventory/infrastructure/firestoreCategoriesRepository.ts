import { collection, getDocs, doc, setDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';

export interface CategoryDoc {
  id: string;
  name: string;
  subcategories: string[];
}

export function categorySlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function fetchCategories(): Promise<CategoryDoc[]> {
  const snap = await getDocs(collection(db, 'categories'));
  const fetched: CategoryDoc[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    fetched.push({ id: docSnap.id, name: data.name || docSnap.id, subcategories: data.subcategories || [] });
  });
  return fetched;
}

export async function persistNewCategory(name: string): Promise<void> {
  const id = categorySlug(name);
  if (!id) return;
  await setDoc(doc(db, 'categories', id), { name, subcategories: [] }, { merge: true });
}

export async function persistNewSubcategory(categoryName: string, subName: string): Promise<void> {
  const id = categorySlug(categoryName);
  if (!id) return;
  await setDoc(doc(db, 'categories', id), { name: categoryName, subcategories: arrayUnion(subName) }, { merge: true });
}
