'use client';

import { useEffect, useMemo, useState } from 'react';
import { DollarSign, Repeat, Users, Wallet } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import EmptyState from '@/shared/ui/EmptyState';
import Spinner from '@/shared/ui/Spinner';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import { buildCustomers } from '@/features/admin/analytics/domain/analytics';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { paginate } from '@/features/admin/inventory/domain/productList';
import StatCard from '@/features/admin/presentation/ui/StatCard';
import StatsRow from '@/features/admin/presentation/ui/StatsRow';
import FilterBar from '@/features/admin/presentation/ui/FilterBar';
import { FilterSearch, FilterSelect } from '@/features/admin/presentation/ui/FilterControls';
import ErrorBanner from '@/features/admin/presentation/ui/ErrorBanner';
import Pagination from '@/features/admin/presentation/ui/Pagination';
import { TABLE_ROW, TableCard, TableScroll, Th } from '@/features/admin/presentation/ui/TableCard';
import {
  DEFAULT_CUSTOMER_FILTERS,
  activeCustomerFilterCount,
  customerInitials,
  customerStats,
  filterCustomers,
  isGuestCustomer,
  type CustomerFilters,
  type CustomerSort,
  type CustomerTypeFilter,
} from '../domain/customerList';

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const { orders, loading, error, reload } = useAdminData();
  const [filters, setFilters] = useState<CustomerFilters>(DEFAULT_CUSTOMER_FILTERS);
  const [page, setPage] = useState(1);
  const [dismissed, setDismissed] = useState(false);
  const customers = useMemo(() => buildCustomers(orders), [orders]);
  const stats = useMemo(() => customerStats(customers), [customers]);
  const rows = useMemo(() => filterCustomers(customers, filters), [customers, filters]);
  const pageData = paginate(rows, page, PAGE_SIZE);
  const activeCount = activeCustomerFilterCount(filters);
  const firstLoad = loading && customers.length === 0;

  useEffect(() => setDismissed(false), [error]);
  const update = (f: CustomerFilters) => {
    setFilters(f);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Customers" subtitle="Everyone who has placed an order." />
      {firstLoad ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : (
        <>
          {error && !dismissed && (
            <div className="space-y-2">
              <ErrorBanner message={error} onDismiss={() => setDismissed(true)} />
              <button type="button" onClick={reload} className="text-xs font-bold underline">Retry</button>
            </div>
          )}
          {customers.length === 0 && !error ? (
            <EmptyState icon={Users} title="No customers yet" description="Customers appear here after their first order." />
          ) : customers.length > 0 && (
            <>
              <StatsRow>
                <StatCard icon={<Users className="h-5 w-5" />} label="Customers" value={stats.total} />
                <StatCard icon={<Repeat className="h-5 w-5" />} label="Repeat customers" value={stats.repeat} caption="2 or more orders" />
                <StatCard icon={<Wallet className="h-5 w-5" />} label="Average order value" value={formatCurrency(stats.avgOrderValue)} />
                <StatCard icon={<DollarSign className="h-5 w-5" />} label="Total revenue" value={formatCurrency(stats.revenue)} />
              </StatsRow>
              <FilterBar activeCount={activeCount} onReset={() => update(DEFAULT_CUSTOMER_FILTERS)}>
                <FilterSearch
                  id="admin-customer-search"
                  value={filters.search}
                  onChange={(search) => update({ ...filters, search })}
                  placeholder="Search name, email or phone"
                />
                <FilterSelect aria-label="Type" value={filters.type} onChange={(e) => update({ ...filters, type: e.target.value as CustomerTypeFilter })}>
                  <option value="">Type: All</option>
                  <option value="guest">Guest</option>
                  <option value="registered">Registered</option>
                </FilterSelect>
                <FilterSelect aria-label="Sort" value={filters.sort} onChange={(e) => update({ ...filters, sort: e.target.value as CustomerSort })}>
                  <option value="spent-desc">Total spent: high to low</option>
                  <option value="orders-desc">Orders: high to low</option>
                  <option value="latest">Latest order</option>
                  <option value="name">Name: A to Z</option>
                </FilterSelect>
              </FilterBar>
              <TableCard>
                <TableScroll
                  minWidth="min-w-[760px]"
                  head={
                    <>
                      <Th className="pl-5">Customer</Th>
                      <Th>Contact</Th>
                      <Th>Orders</Th>
                      <Th>Total spent</Th>
                      <Th>Last order</Th>
                    </>
                  }
                >
                  {pageData.items.map((c) => (
                    <tr key={c.key} className={TABLE_ROW}>
                      <td className="py-3 pl-5 pr-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0F0F0] text-xs font-bold text-[#555555]">
                            {customerInitials(c.name)}
                          </span>
                          <span className="font-medium text-black">{c.name}</span>
                          {isGuestCustomer(c) && (
                            <span className="rounded-md bg-[#F0F0F0] px-2 py-0.5 text-[10px] font-semibold text-[#555555]">Guest</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3">
                        <div>{c.phone || '—'}</div>
                        <div className="text-xs text-[#717171]">{c.email || '—'}</div>
                      </td>
                      <td className="px-3">{c.orderCount}</td>
                      <td className="px-3 font-medium">{formatCurrency(c.totalSpent)}</td>
                      <td className="px-3 text-[#717171]">{new Date(c.lastOrderAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={5} className="py-10 text-center text-sm text-[#717171]">No customers match your filters.</td></tr>
                  )}
                </TableScroll>
                <div className="flex justify-end border-t border-[#EEEEEE] p-4">
                  <Pagination from={pageData.from} to={pageData.to} total={pageData.total} page={pageData.page} totalPages={pageData.totalPages} onPage={setPage} />
                </div>
              </TableCard>
            </>
          )}
        </>
      )}
    </div>
  );
}
