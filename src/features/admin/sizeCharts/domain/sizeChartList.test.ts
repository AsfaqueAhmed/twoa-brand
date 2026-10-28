import { describe, expect, it } from 'vitest';
import type { SizeChart } from '@/shared/domain/types';
import { columnChips, filterSizeCharts, linkedProductCounts, sizeChartStats } from './sizeChartList';

const chart = (id: string, name: string, rows = 2, columns = ['Chest']): SizeChart => ({
  id, name, columns, rows: Array.from({ length: rows }, () => ({ size: 'S', values: [''] })),
});
const charts = [chart('a', "Men's Tee"), chart('b', 'Women Dress', 3), chart('c', 'Kids', 1)];
const counts = linkedProductCounts([{ sizeChartId: 'a' }, { sizeChartId: 'a' }, { sizeChartId: 'b' }, {}]);

describe('sizeChartList', () => {
  it('counts linked products', () => {
    expect(counts).toEqual({ a: 2, b: 1 });
  });
  it('computes stats, with null usage when unknown', () => {
    expect(sizeChartStats(charts, counts)).toEqual({ total: 3, sizeRows: 6, inUse: 2, unused: 1 });
    expect(sizeChartStats(charts, null)).toEqual({ total: 3, sizeRows: 6, inUse: null, unused: null });
  });
  it('filters by name and usage', () => {
    expect(filterSizeCharts(charts, { search: 'tee', usage: '' }, counts).map((c) => c.id)).toEqual(['a']);
    expect(filterSizeCharts(charts, { search: '', usage: 'used' }, counts).map((c) => c.id)).toEqual(['a', 'b']);
    expect(filterSizeCharts(charts, { search: '', usage: 'unused' }, counts).map((c) => c.id)).toEqual(['c']);
    expect(filterSizeCharts(charts, { search: '', usage: 'used' }, null)).toHaveLength(3);
  });
  it('limits column chips', () => {
    expect(columnChips(['a', 'b', 'c', 'd', 'e', 'f'])).toEqual({ shown: ['a', 'b', 'c', 'd'], extra: 2 });
    expect(columnChips(['a'])).toEqual({ shown: ['a'], extra: 0 });
  });
});
