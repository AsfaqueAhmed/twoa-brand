import { supabase } from '@/shared/infrastructure/supabase/client';
import type { SizeChart } from '@/shared/domain/types';

function toSizeChart(row: Record<string, any>): SizeChart {
  return {
    id: row.id,
    name: row.name || '',
    columns: Array.isArray(row.columns) ? row.columns : [],
    rows: Array.isArray(row.rows) ? row.rows : [],
  };
}

export async function fetchSizeCharts(): Promise<SizeChart[]> {
  const { data, error } = await supabase.from('size_charts').select('*');
  if (error) throw error;
  return (data || []).map(toSizeChart);
}

export async function saveSizeChart(chart: SizeChart): Promise<void> {
  const { error } = await supabase
    .from('size_charts')
    .upsert({ id: chart.id, name: chart.name, columns: chart.columns, rows: chart.rows });
  if (error) throw error;
}

export async function deleteSizeChart(id: string): Promise<void> {
  const { error } = await supabase.from('size_charts').delete().eq('id', id);
  if (error) throw error;
}
