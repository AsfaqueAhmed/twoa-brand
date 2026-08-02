import { supabase } from '@/shared/infrastructure/supabase/client';
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

  const { data, error } = await supabase.from('size_charts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  const chart: SizeChart | null = data
    ? { id: data.id, name: data.name || '', columns: data.columns || [], rows: data.rows || [] }
    : null;

  cache.set(id, { chart, fetchedAt: Date.now() });
  return chart;
}
