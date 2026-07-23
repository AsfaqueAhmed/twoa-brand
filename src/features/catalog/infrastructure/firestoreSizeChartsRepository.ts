import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { SizeChart } from '@/shared/domain/types';

export async function fetchSizeChartById(id: string): Promise<SizeChart | null> {
  const snap = await getDoc(doc(db, 'sizeCharts', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name || '',
    columns: Array.isArray(data.columns) ? data.columns : [],
    rows: Array.isArray(data.rows) ? data.rows : [],
  };
}
