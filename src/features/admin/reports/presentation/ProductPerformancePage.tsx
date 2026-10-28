'use client';

import { useMemo, useState } from 'react';
import { Package, Layers, Coins, Trophy } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import EmptyState from '@/shared/ui/EmptyState';
import Spinner from '@/shared/ui/Spinner';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import { lastNDays, filterOrdersByRange, topProducts } from '@/features/admin/analytics/domain/analytics';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { paginate } from '@/features/admin/inventory/domain/productList';
import StatCard from '@/features/admin/presentation/ui/StatCard';
import StatsRow from '@/features/admin/presentation/ui/StatsRow';
import FilterBar from '@/features/admin/presentation/ui/FilterBar';
import { FilterSearch } from '@/features/admin/presentation/ui/FilterControls';
import Pagination from '@/features/admin/presentation/ui/Pagination';
import { TABLE_ROW, TableCard, TableScroll, Th } from '@/features/admin/presentation/ui/TableCard';
import { filterByName, revenueShare } from '../domain/reportStats';
import ReportRangeSelect from './ReportRangeSelect';
import ReportError from './ReportError';

const PAGE_SIZE = 20;

export default function ProductPerformancePage() {
  const { orders, loading, error, reload } = useAdminData();
  const [days, setDays] = useState(7);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const firstLoad = loading && orders.length === 0;
  const all = useMemo(() => topProducts(filterOrdersByRange(orders, lastNDays(days)), Number.MAX_SAFE_INTEGER), [orders, days]);
  const totals = useMemo(() => ({
    units: all.reduce((s, p) => s + p.sold, 0),
    revenue: all.reduce((s, p) => s + p.revenue, 0),
  }), [all]);
  const ranked = useMemo(() => all.map((p, i) => ({ ...p, rank: i + 1 })), [all]);
  const rows = useMemo(() => filterByName(ranked, search), [ranked, search]);
  const pageData = paginate(rows, page, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Product Performance"
        subtitle="Best sellers by units and revenue."
        actions={<ReportRangeSelect days={days} onChange={(d) => { setDays(d); setPage(1); }} />}
      />
      {firstLoad ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : (
        <>
          <ReportError error={error} onRetry={reload} />
          {all.length === 0 ? (
            !error && <EmptyState icon={Package} title="No sales in this period" description="Try a longer date range." />
          ) : (
            <>
              <StatsRow>
                <StatCard icon={<Package className="h-5 w-5" />} label="Products sold" value={all.length} />
                <StatCard icon={<Layers className="h-5 w-5" />} label="Units sold" value={totals.units} />
                <StatCard icon={<Coins className="h-5 w-5" />} label="Revenue" value={formatCurrency(totals.revenue)} />
                <StatCard icon={<Trophy className="h-5 w-5" />} label="Top product" value={all[0].name} caption={`${all[0].sold} units`} />
              </StatsRow>
              <FilterBar activeCount={search.trim() ? 1 : 0} onReset={() => { setSearch(''); setPage(1); }}>
                <FilterSearch id="admin-report-product-search" value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search products" />
              </FilterBar>
              <TableCard>
                <TableScroll
                  minWidth="min-w-[640px]"
                  head={
                    <>
                      <Th className="pl-5">Rank</Th>
                      <Th>Product</Th>
                      <Th>Units sold</Th>
                      <Th>Revenue</Th>
                      <Th className="pr-5">Share of revenue</Th>
                    </>
                  }
                >
                  {pageData.items.map((p) => {
                    const share = revenueShare(p.revenue, totals.revenue);
                    return (
                      <tr key={p.productId} className={TABLE_ROW}>
                        <td className="py-3 pl-5 pr-3 text-[#717171]">{p.rank}</td>
                        <td className="px-3">
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.image} alt="" className="h-10 w-10 rounded-lg border border-[#EEEEEE] object-cover" />
                            <span className="font-medium text-black">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-3">{p.sold}</td>
                        <td className="px-3 font-medium">{formatCurrency(p.revenue)}</td>
                        <td className="px-3 pr-5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#F0F0F0]">
                              <div className="h-full rounded-full bg-black" style={{ width: `${Math.min(100, share)}%` }} />
                            </div>
                            <span className="text-xs text-[#717171]">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={5} className="py-10 text-center text-sm text-[#717171]">No products match your search.</td></tr>
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
