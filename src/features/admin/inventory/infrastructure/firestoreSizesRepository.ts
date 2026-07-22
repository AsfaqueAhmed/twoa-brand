import { doc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL'];

// Sizes are stored as a single document (a flat list of labels, unlike categories
// which need per-category subcategory arrays) so every admin sees the same
// reusable set of size options across all products.
export async function fetchSizes(): Promise<string[]> {
  const snap = await getDoc(doc(db, 'sizes', 'master'));
  if (!snap.exists()) return DEFAULT_SIZES;
  const values = snap.data().values;
  return Array.isArray(values) && values.length > 0 ? values : DEFAULT_SIZES;
}

export async function persistNewSize(size: string): Promise<void> {
  const trimmed = size.trim().toUpperCase();
  if (!trimmed) return;
  await setDoc(doc(db, 'sizes', 'master'), { values: arrayUnion(trimmed) }, { merge: true });
}
