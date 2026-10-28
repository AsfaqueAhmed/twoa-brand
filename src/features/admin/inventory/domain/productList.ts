import type { ParentProduct, Product } from '@/shared/domain/types';

export type StockLevel = 'in' | 'low' | 'out';
export const LOW_STOCK_THRESHOLD = 10;

export function productTotalStock(p: Product): number | null {
  if (!p.parentProduct) return null;
  return Object.values(p.parentProduct.stockBySize).reduce((sum, n) => sum + (Number(n) || 0), 0);
}

export function stockLevel(total: number | null): StockLevel {
  if (total === null || total <= 0) return 'out';
  if (total <= LOW_STOCK_THRESHOLD) return 'low';
  return 'in';
}

export type ProductStatus = 'active' | 'low' | 'out' | 'inactive';

export function productStatus(p: Product): ProductStatus {
  if (p.isActive === false) return 'inactive';
  const level = stockLevel(productTotalStock(p));
  return level === 'in' ? 'active' : level;
}

export type ProductFilters = {
  search: string;
  category: string;
  status: '' | 'active' | 'inactive';
  stock: '' | StockLevel;
};

export const DEFAULT_FILTERS: ProductFilters = { search: '', category: '', status: '', stock: '' };

export function filterProducts(products: Product[], f: ProductFilters): Product[] {
  const q = f.search.trim().toLowerCase();
  return products.filter((p) => {
    if (q) {
      const hay = [p.name, p.category, p.subcategory ?? '', p.id].some((v) => v.toLowerCase().includes(q));
      if (!hay) return false;
    }
    if (f.category && p.category !== f.category) return false;
    if (f.status === 'active' && p.isActive === false) return false;
    if (f.status === 'inactive' && p.isActive !== false) return false;
    if (f.stock && stockLevel(productTotalStock(p)) !== f.stock) return false;
    return true;
  });
}

export type ProductSort = '' | 'name' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc';

export function sortProducts(products: Product[], sort: ProductSort): Product[] {
  const out = [...products];
  const stock = (p: Product) => productTotalStock(p) ?? 0;
  switch (sort) {
    case 'name':
      return out.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    case 'price_asc':
      return out.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return out.sort((a, b) => b.price - a.price);
    case 'stock_asc':
      return out.sort((a, b) => stock(a) - stock(b));
    case 'stock_desc':
      return out.sort((a, b) => stock(b) - stock(a));
    default:
      return out;
  }
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    items: slice,
    page: current,
    totalPages,
    from: total === 0 ? 0 : start + 1,
    to: total === 0 ? 0 : start + slice.length,
    total,
  };
}

export function productStats(products: Product[]) {
  const total = products.length;
  const active = products.filter((p) => p.isActive !== false).length;
  const out = products.filter((p) => stockLevel(productTotalStock(p)) === 'out').length;
  const low = products.filter((p) => stockLevel(productTotalStock(p)) === 'low').length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  return { total, active, out, low, activePct: pct(active), outPct: pct(out), lowPct: pct(low) };
}

export function activeFilterCount(f: ProductFilters, sort: ProductSort): number {
  return [f.search.trim(), f.category, f.status, f.stock, sort].filter(Boolean).length;
}

export type StockAdjustMode = 'set' | 'add' | 'remove';

export function nextStock(current: number, mode: StockAdjustMode, amount: number): number {
  if (mode === 'set') return amount;
  if (mode === 'add') return current + amount;
  return Math.max(0, current - amount);
}

// Stock bars are drawn relative to this many units; anything above fills the bar.
export const STOCK_BAR_MAX = 60;

export function stockBarPercent(total: number | null, max: number = STOCK_BAR_MAX): number {
  if (total === null || total <= 0 || max <= 0) return 0;
  return Math.min(100, Math.round((total / max) * 100));
}

// Stock is shared per parent product: returns the distinct parent ids of the
// selected products plus how many selected products have no parent (skipped).
export function distinctParentIds(products: Product[], selectedIds: string[]) {
  const selected = new Set(selectedIds);
  const parents = new Set<string>();
  let skipped = 0;
  for (const p of products) {
    if (!selected.has(p.id)) continue;
    if (p.parentProductId) parents.add(p.parentProductId);
    else skipped += 1;
  }
  return { parentIds: [...parents], skipped };
}

// Joins each product with its parent product (the source of sizes and stock).
export function attachParentProducts(products: Product[], parents: ParentProduct[]): Product[] {
  const byId = new Map(parents.map((pp) => [pp.id, pp]));
  return products.map((p) => ({ ...p, parentProduct: p.parentProductId ? byId.get(p.parentProductId) : undefined }));
}

export function validateStockAmount(amount: number): string | null {
  return Number.isInteger(amount) && amount >= 0 ? null : 'Enter a whole number of 0 or more.';
}
