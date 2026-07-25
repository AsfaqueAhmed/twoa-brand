import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { SizeChart } from '@/shared/domain/types';

// Size charts rarely change, and many products share the same chart, so cache
// each one in memory for an hour instead of re-fetching on every product view.
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { chart: SizeChart | null; fetchedAt: number }>();

export async function fetchSizeChartById(id: string): Promise<SizeChart | null> {
  const cached = cache.get(id);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.chart;
  }

  const snap = await getDoc(doc(db, 'sizeCharts', id));
  const chart: SizeChart | null = snap.exists()
    ? {
        id: snap.id,
        name: snap.data().name || '',
        columns: Array.isArray(snap.data().columns) ? snap.data().columns : [],
        rows: Array.isArray(snap.data().rows) ? snap.data().rows : [],
      }
    : null;

  cache.set(id, { chart, fetchedAt: Date.now() });
  return chart;
}
