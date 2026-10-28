'use client';

import { useMemo, useState } from 'react';
import { ShoppingCart, Coins, Package, Wallet } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import Spinner from '@/shared/ui/Spinner';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import { lastNDays, previousRange, computeStats, percentChange, dailySales } from '@/features/admin/analytics/domain/analytics';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { paginate } from '@/features/admin/inventory/domain/productList';
import SalesChart from '@/features/admin/dashboard/presentation/SalesChart';
import StatCard from '@/features/admin/presentation/ui/StatCard';
import StatsRow from '@/features/admin/presentation/ui/StatsRow';
import Pagination from '@/features/admin/presentation/ui/Pagination';
import { TABLE_ROW, TableCard, TableScroll, Th } from '@/features/admin/presentation/ui/TableCard';
import { averageOrderValue, changeCaption } from '../domain/reportStats';
import ReportRangeSelect from './ReportRangeSelect';
import ReportError from './ReportError';

const PAGE_SIZE = 20;

export default function SalesReportPage() {
  const { orders, loading, error, reload } = useAdminData();
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const firstLoad = loading && orders.length === 0;
  const view = useMemo(() => {
    const range = lastNDays(days);
    const cur = computeStats(orders, range);
    const old = computeStats(orders, previousRange(range));
    const series = dailySales(orders, range);
    return {
      cur,
      aov: averageOrderValue(cur.totalSales, cur.totalOrders),
      change: {
        orders: percentChange(cur.totalOrders, old.totalOrders),
        sales: percentChange(cur.totalSales, old.totalSales),
        sold: percentChange(cur.productsSold, old.productsSold),
      },
      series,
      rows: [...series].reverse(),
    };
  }, [orders, days]);
  const pageData = paginate(view.rows, page, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Sales Report"
        subtitle="Revenue and orders over time."
        actions={<ReportRangeSelect days={days} onChange={(d) => { setDays(d); setPage(1); }} />}
      />
      {firstLoad ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : (
        <>
          <ReportError error={error} onRetry={reload} />
          <StatsRow>
            <StatCard icon={<ShoppingCart className="h-5 w-5" />} label="Orders" value={view.cur.totalOrders} caption={changeCaption(view.change.orders)} />
            <StatCard icon={<Coins className="h-5 w-5" />} label="Sales" value={formatCurrency(view.cur.totalSales)} caption={changeCaption(view.change.sales)} />
            <StatCard icon={<Package className="h-5 w-5" />} label="Products sold" value={view.cur.productsSold} caption={changeCaption(view.change.sold)} />
            <StatCard icon={<Wallet className="h-5 w-5" />} label="Average order value" value={formatCurrency(view.aov)} />
          </StatsRow>
          <section className="rounded-xl border border-[#EEEEEE] bg-white p-5">
            <h2 className="mb-4 text-base font-bold text-black">Sales Overview</h2>
            <SalesChart data={view.series} />
          </section>
          <TableCard>
            <div className="border-b border-[#EEEEEE] px-5 py-4 text-base font-bold text-black">Daily Sales</div>
            <TableScroll
              minWidth="min-w-[360px]"
              head={<><Th className="pl-5">Date</Th><Th className="pr-5 text-right">Total</Th></>}
            >
              {pageData.items.map((r) => (
                <tr key={r.date} className={TABLE_ROW}>
                  <td className="py-3 pl-5 pr-3">{r.date}</td>
                  <td className="py-3 pl-3 pr-5 text-right font-medium">{formatCurrency(r.total)}</td>
                </tr>
              ))}
            </TableScroll>
            <div className="flex justify-end border-t border-[#EEEEEE] p-4">
              <Pagination from={pageData.from} to={pageData.to} total={pageData.total} page={pageData.page} totalPages={pageData.totalPages} onPage={setPage} />
            </div>
          </TableCard>
        </>
      )}
    </div>
  );
}
