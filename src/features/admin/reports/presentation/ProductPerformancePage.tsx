'use client';

import { useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import AdminCard from '@/features/admin/presentation/AdminCard';
import EmptyState from '@/shared/ui/EmptyState';
import Spinner from '@/shared/ui/Spinner';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import { lastNDays, filterOrdersByRange, topProducts } from '@/features/admin/analytics/domain/analytics';
import { formatCurrency } from '@/shared/lib/formatCurrency';

const RANGES = [{ label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }, { label: 'Last 90 days', days: 90 }];

export default function ProductPerformancePage() {
  const { orders, loading, error, reload } = useAdminData();
  const [days, setDays] = useState(7);
  const rows = useMemo(() => topProducts(filterOrdersByRange(orders, lastNDays(days)), 50), [orders, days]);

  return (
    <div>
      <AdminPageHeader
        title="Product Performance"
        subtitle="Best sellers by units and revenue."
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
        rows.length === 0 ? (
          <EmptyState icon={Package} title="No sales in this period" description="Try a longer date range." />
        ) : (
          <AdminCard>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="text-xs text-[#717171]">
                  <tr><th className="py-2 font-medium">Rank</th><th className="font-medium">Product</th><th className="font-medium">Units Sold</th><th className="text-right font-medium">Revenue</th></tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEEE]">
                  {rows.map((p, i) => (
                    <tr key={p.productId}>
                      <td className="py-3 text-[#717171]">{i + 1}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" />
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td>{p.sold}</td>
                      <td className="text-right">{formatCurrency(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        )
      )}
    </div>
  );
}
