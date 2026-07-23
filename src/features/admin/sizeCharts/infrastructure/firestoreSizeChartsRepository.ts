import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { SizeChart } from '@/shared/domain/types';

function toSizeChart(id: string, data: Record<string, any>): SizeChart {
  return {
    id,
    name: data.name || '',
    columns: Array.isArray(data.columns) ? data.columns : [],
    rows: Array.isArray(data.rows) ? data.rows : [],
  };
}

export async function fetchSizeCharts(): Promise<SizeChart[]> {
  const snap = await getDocs(collection(db, 'sizeCharts'));
  return snap.docs.map((d) => toSizeChart(d.id, d.data()));
}

export async function saveSizeChart(chart: SizeChart): Promise<void> {
  await setDoc(doc(db, 'sizeCharts', chart.id), {
    name: chart.name,
    columns: chart.columns,
    rows: chart.rows,
  });
}

export async function deleteSizeChart(id: string): Promise<void> {
  await deleteDoc(doc(db, 'sizeCharts', id));
}
