import { Filter, Search } from 'lucide-react';
import { FILTER_CONTROL as CONTROL, FilterSelect } from '@/features/admin/inventory/presentation/list/FilterControls';
import type { ParentFilters, ParentSort } from '../../domain/parentList';

type Props = {
  filters: ParentFilters;
  sort: ParentSort;
  activeCount: number;
  onFilters: (f: ParentFilters) => void;
  onSort: (s: ParentSort) => void;
  onReset: () => void;
};

export default function ParentFilterBar({ filters, sort, activeCount, onFilters, onSort, onReset }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#EEEEEE] bg-[#FAF9F6] p-4">
      <div className="relative min-w-[220px] flex-1">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#717171]" />
        <input
          type="text"
          id="parentproduct-search-input"
          placeholder="Search parent products by name or ID..."
          value={filters.search}
          onChange={(e) => onFilters({ ...filters, search: e.target.value })}
          className="h-10 w-full rounded-lg border border-[#EEEEEE] bg-white pl-10 pr-4 text-xs font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none"
        />
      </div>
      <FilterSelect aria-label="Stock status" value={filters.stock} onChange={(e) => onFilters({ ...filters, stock: e.target.value as ParentFilters['stock'] })}>
        <option value="">Stock Status</option>
        <option value="in">In stock</option>
        <option value="low">Low stock</option>
        <option value="out">Out of stock</option>
      </FilterSelect>
      <FilterSelect aria-label="Sort by" value={sort} onChange={(e) => onSort(e.target.value as ParentSort)}>
        <option value="">Sort by</option>
        <option value="name">Name A-Z</option>
        <option value="stock_asc">Stock low-high</option>
        <option value="stock_desc">Stock high-low</option>
        <option value="linked_desc">Linked products high-low</option>
      </FilterSelect>
      <span className={CONTROL}>
        <Filter className="h-3.5 w-3.5" />
        Filter{activeCount > 0 && <span className="rounded-full bg-black px-1.5 text-[10px] text-white">{activeCount}</span>}
      </span>
      <button type="button" onClick={onReset} disabled={activeCount === 0} className={`${CONTROL} hover:border-black disabled:opacity-40`}>
        Reset
      </button>
    </div>
  );
}
