import type { Product, SizeChart } from '@/shared/domain/types';

export type SizeChartUsageFilter = '' | 'used' | 'unused';

export interface SizeChartFilters {
  search: string;
  usage: SizeChartUsageFilter;
}

export const DEFAULT_SIZE_CHART_FILTERS: SizeChartFilters = { search: '', usage: '' };

/** chart id -> number of products referencing it via `sizeChartId`. */
export function linkedProductCounts(products: Pick<Product, 'sizeChartId'>[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of products) {
    if (p.sizeChartId) counts[p.sizeChartId] = (counts[p.sizeChartId] ?? 0) + 1;
  }
  return counts;
}

/** `counts` is null when products could not be loaded: usage is unknown, so usage filters are ignored. */
export function filterSizeCharts(
  charts: SizeChart[],
  f: SizeChartFilters,
  counts: Record<string, number> | null
): SizeChart[] {
  const q = f.search.trim().toLowerCase();
  return charts.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (counts && f.usage === 'used' && !(counts[c.id] > 0)) return false;
    if (counts && f.usage === 'unused' && counts[c.id] > 0) return false;
    return true;
  });
}

export function activeSizeChartFilterCount(f: SizeChartFilters): number {
  return (f.search.trim() ? 1 : 0) + (f.usage ? 1 : 0);
}

export function sizeChartStats(charts: SizeChart[], counts: Record<string, number> | null) {
  const inUse = counts ? charts.filter((c) => counts[c.id] > 0).length : null;
  return {
    total: charts.length,
    sizeRows: charts.reduce((sum, c) => sum + c.rows.length, 0),
    inUse,
    unused: inUse === null ? null : charts.length - inUse,
  };
}

/** First `max` column names plus the number of hidden ones. */
export function columnChips(columns: string[], max = 4): { shown: string[]; extra: number } {
  return { shown: columns.slice(0, max), extra: Math.max(0, columns.length - max) };
}
