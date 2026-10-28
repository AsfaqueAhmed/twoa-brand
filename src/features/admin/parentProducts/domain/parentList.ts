import type { ParentProduct, Product } from '@/shared/domain/types';
import { stockLevel, type StockLevel } from '@/features/admin/inventory/domain/productList';

export function parentTotalStock(pp: ParentProduct): number {
  return pp.sizeOrder.reduce((sum, size) => sum + (Number(pp.stockBySize[size]) || 0), 0);
}

export function linkedProductCounts(products: Pick<Product, 'parentProductId'>[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of products) {
    if (!p.parentProductId) continue;
    counts.set(p.parentProductId, (counts.get(p.parentProductId) ?? 0) + 1);
  }
  return counts;
}

export type ParentFilters = { search: string; stock: '' | StockLevel };

export const DEFAULT_PARENT_FILTERS: ParentFilters = { search: '', stock: '' };

export function filterParents(parents: ParentProduct[], f: ParentFilters): ParentProduct[] {
  const q = f.search.trim().toLowerCase();
  return parents.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false;
    if (f.stock && stockLevel(parentTotalStock(p)) !== f.stock) return false;
    return true;
  });
}

export type ParentSort = '' | 'name' | 'stock_asc' | 'stock_desc' | 'linked_desc';

export function sortParents(parents: ParentProduct[], sort: ParentSort, linked: Map<string, number>): ParentProduct[] {
  const out = [...parents];
  switch (sort) {
    case 'name':
      return out.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    case 'stock_asc':
      return out.sort((a, b) => parentTotalStock(a) - parentTotalStock(b));
    case 'stock_desc':
      return out.sort((a, b) => parentTotalStock(b) - parentTotalStock(a));
    case 'linked_desc':
      return out.sort((a, b) => (linked.get(b.id) ?? 0) - (linked.get(a.id) ?? 0));
    default:
      return out;
  }
}

export function parentStats(parents: ParentProduct[]) {
  const total = parents.length;
  const totals = parents.map(parentTotalStock);
  const totalStock = totals.reduce((a, b) => a + b, 0);
  const low = totals.filter((t) => stockLevel(t) === 'low').length;
  const out = totals.filter((t) => stockLevel(t) === 'out').length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  return { total, totalStock, low, out, lowPct: pct(low), outPct: pct(out) };
}

export function activeParentFilterCount(f: ParentFilters, sort: ParentSort): number {
  return [f.search.trim(), f.stock, sort].filter(Boolean).length;
}
