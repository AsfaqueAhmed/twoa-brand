'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Coins, Package, Users, RefreshCw } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import AdminCard from '@/features/admin/presentation/AdminCard';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import {
  lastNDays, previousRange, computeStats, percentChange, filterOrdersByRange, countByStatus,
  dailySales, topProducts, lowStockProducts, recentActivity,
} from '@/features/admin/analytics/domain/analytics';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import Spinner from '@/shared/ui/Spinner';
import { useAuth } from '@/features/auth/presentation/AuthProvider';
import StatCard from './StatCard';
import SalesChart from './SalesChart';
import StatusDonut from './StatusDonut';
import QuickActions from './QuickActions';
import LowStockList from './LowStockList';
import RecentOrdersTable from './RecentOrdersTable';
import TopSellers from './TopSellers';
import RecentActivity from './RecentActivity';

const RANGES = [{ label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }, { label: 'Last 90 days', days: 90 }];

export default function DashboardPage() {
  const { user } = useAuth();
  const { orders, products, loading, error, reload } = useAdminData({ products: true });
  const [days, setDays] = useState(7);

  const view = useMemo(() => {
    const range = lastNDays(days);
    const prev = previousRange(range);
    const cur = computeStats(orders, range);
    const old = computeStats(orders, prev);
    const inWindow = filterOrdersByRange(orders, range);
    return {
      cur,
      change: {
        orders: percentChange(cur.totalOrders, old.totalOrders),
        sales: percentChange(cur.totalSales, old.totalSales),
        sold: percentChange(cur.productsSold, old.productsSold),
        customers: percentChange(cur.newCustomers, old.newCustomers),
      },
      statusCounts: countByStatus(inWindow),
      series: dailySales(orders, range),
      recent: inWindow.slice(0, 5),
      top: topProducts(inWindow, 5),
      lowStock: lowStockProducts(products, 10, 5),
      activity: recentActivity(orders, 5),
    };
  }, [orders, products, days]);

  const firstName = user?.displayName?.split(' ')[0] ?? 'there';

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${firstName}! Here's what's happening with your store today.`}
        actions={
          <>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-md border border-[#EEEEEE] bg-white px-3 py-2 text-sm" aria-label="Date range">
              {RANGES.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}
            </select>
            <button type="button" onClick={reload} className="rounded-md border border-[#EEEEEE] bg-white p-2" aria-label="Reload"><RefreshCw className="h-4 w-4" /></button>
          </>
        }
      />

      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          Couldn&apos;t load dashboard data: {error}{' '}
          <button type="button" onClick={reload} className="font-bold underline">Retry</button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={ShoppingCart} label="Total Orders" value={String(view.cur.totalOrders)} change={view.change.orders} />
            <StatCard icon={Coins} label="Total Sales" value={formatCurrency(view.cur.totalSales)} change={view.change.sales} />
            <StatCard icon={Package} label="Products Sold" value={String(view.cur.productsSold)} change={view.change.sold} />
            <StatCard icon={Users} label="New Customers" value={String(view.cur.newCustomers)} change={view.change.customers} />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <div className="grid gap-6 lg:grid-cols-5">
                <AdminCard title="Sales Overview" className="lg:col-span-3"><SalesChart data={view.series} /></AdminCard>
                <AdminCard title="Orders by Status" className="lg:col-span-2"><StatusDonut counts={view.statusCounts} /></AdminCard>
              </div>
              <AdminCard title="Recent Orders" action={<Link href="/admin/orders" className="text-xs underline">View All</Link>}>
                <RecentOrdersTable orders={view.recent} />
              </AdminCard>
              <AdminCard title="Top Selling Products" action={<Link href="/admin/reports/products" className="text-xs underline">View All</Link>}>
                <TopSellers items={view.top} />
              </AdminCard>
            </div>
            <div className="space-y-6">
              <AdminCard title="Quick Actions"><QuickActions /></AdminCard>
              <AdminCard title="Low Stock Products" action={<Link href="/admin/products" className="text-xs underline">View All</Link>}>
                <LowStockList items={view.lowStock} />
              </AdminCard>
              <AdminCard title="Recent Activity"><RecentActivity events={view.activity} /></AdminCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
