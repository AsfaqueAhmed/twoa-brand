import FilterBar from '@/features/admin/presentation/ui/FilterBar';
import { FilterSearch, FilterSelect } from '@/features/admin/presentation/ui/FilterControls';
import type { CouponFilters, CouponStatusFilter, CouponTypeFilter } from '../../domain/couponList';

type Props = { filters: CouponFilters; activeCount: number; onFilters: (f: CouponFilters) => void; onReset: () => void };

export default function CouponFilterBar({ filters, activeCount, onFilters, onReset }: Props) {
  return (
    <FilterBar activeCount={activeCount} onReset={onReset}>
      <FilterSearch
        id="admin-coupon-search"
        value={filters.search}
        onChange={(search) => onFilters({ ...filters, search })}
        placeholder="Search by coupon code..."
      />
      <FilterSelect
        aria-label="Status"
        value={filters.status}
        onChange={(e) => onFilters({ ...filters, status: e.target.value as CouponStatusFilter })}
      >
        <option value="">Status: All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="expired">Expired</option>
        <option value="limit">Limit reached</option>
      </FilterSelect>
      <FilterSelect
        aria-label="Type"
        value={filters.type}
        onChange={(e) => onFilters({ ...filters, type: e.target.value as CouponTypeFilter })}
      >
        <option value="">Type: All</option>
        <option value="percentage">Percentage</option>
        <option value="flat">Flat</option>
        <option value="free_shipping">Free shipping</option>
      </FilterSelect>
    </FilterBar>
  );
}
