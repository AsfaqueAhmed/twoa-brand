import { Filter, Search } from 'lucide-react';
import { FILTER_CONTROL as CONTROL, FilterSelect } from './FilterControls';
import type { ProductFilters, ProductSort } from '../../domain/productList';

type Props = {
  filters: ProductFilters;
  sort: ProductSort;
  categories: string[];
  activeCount: number;
  onFilters: (f: ProductFilters) => void;
  onSort: (s: ProductSort) => void;
  onReset: () => void;
};

export default function ProductFilterBar({ filters, sort, categories, activeCount, onFilters, onSort, onReset }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#EEEEEE] bg-[#FAF9F6] p-4">
      <div className="relative min-w-[220px] flex-1">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#717171]" />
        <input
          type="text"
          id="inventory-search-input"
          placeholder="Search products by name, category..."
          value={filters.search}
          onChange={(e) => onFilters({ ...filters, search: e.target.value })}
          className="h-10 w-full rounded-lg border border-[#EEEEEE] bg-white pl-10 pr-4 text-xs font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none"
        />
      </div>
      <FilterSelect aria-label="Category" value={filters.category} onChange={(e) => onFilters({ ...filters, category: e.target.value })}>
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </FilterSelect>
      <FilterSelect aria-label="Status" value={filters.status} onChange={(e) => onFilters({ ...filters, status: e.target.value as ProductFilters['status'] })}>
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </FilterSelect>
      <FilterSelect aria-label="Stock status" value={filters.stock} onChange={(e) => onFilters({ ...filters, stock: e.target.value as ProductFilters['stock'] })}>
        <option value="">Stock Status</option>
        <option value="in">In stock</option>
        <option value="low">Low stock</option>
        <option value="out">Out of stock</option>
      </FilterSelect>
      <FilterSelect aria-label="Sort by" value={sort} onChange={(e) => onSort(e.target.value as ProductSort)}>
        <option value="">Sort by</option>
        <option value="name">Name A-Z</option>
        <option value="price_asc">Price low-high</option>
        <option value="price_desc">Price high-low</option>
        <option value="stock_asc">Stock low-high</option>
        <option value="stock_desc">Stock high-low</option>
      </FilterSelect>
      <span className={CONTROL}>
        <Filter className="h-3.5 w-3.5" />
        Filter{activeCount > 0 && <span className="rounded-full bg-black px-1.5 text-[10px] text-white">{activeCount}</span>}
      </span>
      <button
        type="button"
        onClick={onReset}
        disabled={activeCount === 0}
        className={`${CONTROL} hover:border-black disabled:opacity-40`}
      >
        Reset
      </button>
    </div>
  );
}
