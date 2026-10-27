'use client';

import { useMemo, useState } from 'react';
import { Users, Search } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import AdminCard from '@/features/admin/presentation/AdminCard';
import EmptyState from '@/shared/ui/EmptyState';
import Spinner from '@/shared/ui/Spinner';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import { buildCustomers } from '@/features/admin/analytics/domain/analytics';
import { formatCurrency } from '@/shared/lib/formatCurrency';

export default function CustomersPage() {
  const { orders, loading, error, reload } = useAdminData();
  const [q, setQ] = useState('');
  const customers = useMemo(() => buildCustomers(orders), [orders]);
  const rows = customers.filter((c) => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <AdminPageHeader title="Customers" subtitle="Everyone who has placed an order." />
      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {error} <button type="button" onClick={reload} className="font-bold underline">Retry</button>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" description="Customers appear here after their first order." />
      ) : (
        <AdminCard>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone"
              className="w-full rounded-md border border-[#EEEEEE] py-2 pl-9 pr-3 text-sm" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-[#717171]">
                <tr><th className="py-2 font-medium">Name</th><th className="font-medium">Email</th><th className="font-medium">Phone</th><th className="font-medium">Orders</th><th className="font-medium">Total Spent</th><th className="font-medium">Last Order</th></tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE]">
                {rows.map((c) => (
                  <tr key={c.key}>
                    <td className="py-3 font-medium">{c.name}</td><td>{c.email || '—'}</td><td>{c.phone}</td>
                    <td>{c.orderCount}</td><td>{formatCurrency(c.totalSpent)}</td>
                    <td className="text-[#717171]">{new Date(c.lastOrderAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
