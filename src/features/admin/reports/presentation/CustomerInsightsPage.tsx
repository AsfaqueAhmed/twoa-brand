'use client';

import { useMemo, useState } from 'react';
import { UserPlus, Repeat } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import AdminCard from '@/features/admin/presentation/AdminCard';
import Spinner from '@/shared/ui/Spinner';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import { lastNDays, customerInsights } from '@/features/admin/analytics/domain/analytics';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import StatCard from '@/features/admin/dashboard/presentation/StatCard';

const RANGES = [{ label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }, { label: 'Last 90 days', days: 90 }];

export default function CustomerInsightsPage() {
  const { orders, loading, error, reload } = useAdminData();
  const [days, setDays] = useState(7);
  const insights = useMemo(() => customerInsights(orders, lastNDays(days)), [orders, days]);

  return (
    <div>
      <AdminPageHeader
        title="Customer Insights"
        subtitle="New versus returning customers and top spenders."
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard icon={UserPlus} label="New Customers" value={String(insights.newCustomers)} change={null} />
            <StatCard icon={Repeat} label="Returning Customers" value={String(insights.returningCustomers)} change={null} />
          </div>
          <AdminCard title="Top Spenders">
            {insights.topSpenders.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#717171]">No customer activity in this period.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-[#717171]"><tr><th className="py-2 font-medium">Name</th><th className="font-medium">Orders</th><th className="text-right font-medium">Total Spent</th></tr></thead>
                <tbody className="divide-y divide-[#EEEEEE]">
                  {insights.topSpenders.map((c) => (
                    <tr key={c.key}><td className="py-3 font-medium">{c.name}</td><td>{c.orderCount}</td><td className="text-right">{formatCurrency(c.totalSpent)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </AdminCard>
        </div>
      )}
    </div>
  );
}
