import { FilterSearch, FilterSelect } from '@/features/admin/presentation/ui/FilterControls';
import FilterBar from '@/features/admin/presentation/ui/FilterBar';
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
    <FilterBar activeCount={activeCount} onReset={onReset}>
      <FilterSearch
        id="parentproduct-search-input"
        placeholder="Search parent products by name or ID..."
        value={filters.search}
        onChange={(search) => onFilters({ ...filters, search })}
      />
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
    </FilterBar>
  );
}
