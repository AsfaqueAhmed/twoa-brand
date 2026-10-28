'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Crown, Ticket, TicketX, RefreshCw } from 'lucide-react';
import EmptyState from '@/shared/ui/EmptyState';
import { listAllCoupons } from '@/features/admin/coupons/infrastructure/firestoreCouponAdminRepository';
import type { Coupon } from '@/features/coupons/domain/coupon';
import { paginate } from '@/features/admin/inventory/domain/productList';
import StatCard from '@/features/admin/presentation/ui/StatCard';
import StatsRow from '@/features/admin/presentation/ui/StatsRow';
import FilterBar from '@/features/admin/presentation/ui/FilterBar';
import { FilterSearch, FilterSelect } from '@/features/admin/presentation/ui/FilterControls';
import ErrorBanner from '@/features/admin/presentation/ui/ErrorBanner';
import Pagination from '@/features/admin/presentation/ui/Pagination';
import { TABLE_ROW, TableCard, TableScroll, Th } from '@/features/admin/presentation/ui/TableCard';
import {
  couponStatus,
  filterUsageCoupons,
  formatCouponValue,
  sortByUsage,
  TYPE_LABEL,
  usageStats,
  type UsageSort,
} from '../domain/couponList';
import CouponStatusPill from './list/CouponStatusPill';
import UsageBar from './list/UsageBar';

const PAGE_SIZE = 20;

export default function CouponUsageHistory() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<UsageSort>('usage-desc');
  const [page, setPage] = useState(1);
  const hasLoadedRef = useRef(false);

  const reload = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    try {
      setCoupons(await listAllCoupons());
      hasLoadedRef.current = true;
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const stats = useMemo(() => usageStats(coupons), [coupons]);
  const visible = useMemo(() => sortByUsage(filterUsageCoupons(coupons, search), sort), [coupons, search, sort]);
  const pageData = paginate(visible, page, PAGE_SIZE);
  const activeCount = (search.trim() ? 1 : 0) + (sort !== 'usage-desc' ? 1 : 0);
  const firstLoad = loading && coupons.length === 0;
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [error]);
  const hasData = coupons.length > 0;
  const failedEmpty = !!error && !hasData;
  const now = new Date();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">Usage History</h1>
        <p className="mt-1 text-sm text-[#717171]">How often each coupon has been redeemed.</p>
      </div>

      {!firstLoad && !failedEmpty && (
      <StatsRow>
        <StatCard icon={<Ticket className="h-5 w-5" />} label="Coupons Used" value={stats.used} caption={`of ${coupons.length} coupons`} />
        <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Total Redemptions" value={stats.redemptions} />
        <StatCard
          icon={<Crown className="h-5 w-5" />}
          label="Most Used Code"
          value={stats.mostUsedCode ?? '—'}
          caption={stats.mostUsedCode ? `${stats.mostUsedCount} redemptions` : undefined}
        />
        <StatCard icon={<TicketX className="h-5 w-5" />} label="Coupons Never Used" value={stats.neverUsed} tone="amber" />
      </StatsRow>
      )}

      {firstLoad && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#EEEEEE] py-16">
          <RefreshCw className="h-5 w-5 animate-spin text-[#717171]" />
          <p className="mt-3 text-xs font-semibold text-[#717171]">Loading coupons...</p>
        </div>
      )}

      {!failedEmpty && (
      <FilterBar
        activeCount={activeCount}
        onReset={() => {
          setSearch('');
          setSort('usage-desc');
          setPage(1);
        }}
      >
        <FilterSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by coupon code..."
        />
        <FilterSelect
          aria-label="Sort by"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as UsageSort);
            setPage(1);
          }}
        >
          <option value="usage-desc">Sort: Usage high to low</option>
          <option value="usage-asc">Sort: Usage low to high</option>
          <option value="code">Sort: Code</option>
        </FilterSelect>
      </FilterBar>
      )}

      {error && !(hasData && dismissed) && (
        <ErrorBanner message={error} onRetry={reload} onDismiss={hasData ? () => setDismissed(true) : undefined} />
      )}

      {!firstLoad && !failedEmpty &&
        (visible.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title={coupons.length === 0 ? 'No coupons yet' : 'No coupons found'}
            description={coupons.length === 0 ? 'Create a coupon to start tracking usage.' : 'Try changing or resetting the filters.'}
          />
        ) : (
          <TableCard>
            <div className="flex items-center justify-end border-b border-[#EEEEEE] px-5 py-3">
              <Pagination
                from={pageData.from}
                to={pageData.to}
                total={pageData.total}
                page={pageData.page}
                totalPages={pageData.totalPages}
                onPage={setPage}
              />
            </div>
            <TableScroll
              minWidth="min-w-[640px]"
              head={
                <>
                  <Th className="pl-5">Code</Th>
                  <Th>Discount</Th>
                  <Th>Used / Limit</Th>
                  <Th className="pr-5">Status</Th>
                </>
              }
            >
              {pageData.items.map((c) => (
                <tr key={c.code} className={TABLE_ROW}>
                  <td className="py-3 pl-5 pr-3 font-mono font-bold text-black">{c.code}</td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-black">{formatCouponValue(c)}</div>
                    <div className="text-[11px] text-[#919191]">{TYPE_LABEL[c.discountType]}</div>
                  </td>
                  <td className="px-3 py-3">
                    <UsageBar coupon={c} />
                  </td>
                  <td className="px-3 py-3 pr-5">
                    <CouponStatusPill status={couponStatus(c, now)} />
                  </td>
                </tr>
              ))}
            </TableScroll>
          </TableCard>
        ))}
    </div>
  );
}
