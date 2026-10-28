import { FilterSearch, FilterSelect } from '@/features/admin/presentation/ui/FilterControls';
import FilterBar from '@/features/admin/presentation/ui/FilterBar';
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
    <FilterBar activeCount={activeCount} onReset={onReset}>
      <FilterSearch
        id="inventory-search-input"
        placeholder="Search products by name, category..."
        value={filters.search}
        onChange={(search) => onFilters({ ...filters, search })}
      />
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
    </FilterBar>
  );
}
