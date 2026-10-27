'use client';

import { useMemo, useState } from 'react';
import { ShoppingCart, Coins, Package } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import AdminCard from '@/features/admin/presentation/AdminCard';
import Spinner from '@/shared/ui/Spinner';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import { lastNDays, previousRange, computeStats, percentChange, dailySales } from '@/features/admin/analytics/domain/analytics';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import StatCard from '@/features/admin/dashboard/presentation/StatCard';
import SalesChart from '@/features/admin/dashboard/presentation/SalesChart';

const RANGES = [{ label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }, { label: 'Last 90 days', days: 90 }];

export default function SalesReportPage() {
  const { orders, loading, error, reload } = useAdminData();
  const [days, setDays] = useState(7);
  const view = useMemo(() => {
    const range = lastNDays(days);
    const cur = computeStats(orders, range);
    const old = computeStats(orders, previousRange(range));
    const series = dailySales(orders, range);
    return {
      cur,
      change: {
        orders: percentChange(cur.totalOrders, old.totalOrders),
        sales: percentChange(cur.totalSales, old.totalSales),
        sold: percentChange(cur.productsSold, old.productsSold),
      },
      series,
      rows: [...series].reverse(),
    };
  }, [orders, days]);

  return (
    <div>
      <AdminPageHeader
        title="Sales Report"
        subtitle="Orders and revenue over time."
        actions={
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-md border border-[#EEEEEE] bg-white px-3 py-2 text-sm" aria-label="Date range">
            {RANGES.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}
          </select>
        }
      />
      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {error} <button type="button" onClick={reload} className="font-bold underline">Retry</button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={ShoppingCart} label="Total Orders" value={String(view.cur.totalOrders)} change={view.change.orders} />
            <StatCard icon={Coins} label="Total Sales" value={formatCurrency(view.cur.totalSales)} change={view.change.sales} />
            <StatCard icon={Package} label="Products Sold" value={String(view.cur.productsSold)} change={view.change.sold} />
          </div>
          <AdminCard title="Sales Overview"><SalesChart data={view.series} /></AdminCard>
          <AdminCard title="Daily Sales">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-[#717171]"><tr><th className="py-2 font-medium">Date</th><th className="text-right font-medium">Total</th></tr></thead>
              <tbody className="divide-y divide-[#EEEEEE]">
                {view.rows.map((r) => (
                  <tr key={r.date}><td className="py-3">{r.date}</td><td className="text-right">{formatCurrency(r.total)}</td></tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
        </div>
      )}
    </div>
  );
}
