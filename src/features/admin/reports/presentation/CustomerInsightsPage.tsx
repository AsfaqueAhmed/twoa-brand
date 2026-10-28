'use client';

import { useMemo, useState } from 'react';
import { UserPlus, Repeat, Users, Percent } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import EmptyState from '@/shared/ui/EmptyState';
import Spinner from '@/shared/ui/Spinner';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import { lastNDays, customerInsights } from '@/features/admin/analytics/domain/analytics';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { paginate } from '@/features/admin/inventory/domain/productList';
import StatCard from '@/features/admin/presentation/ui/StatCard';
import StatsRow from '@/features/admin/presentation/ui/StatsRow';
import Pagination from '@/features/admin/presentation/ui/Pagination';
import { TABLE_ROW, TableCard, TableScroll, Th } from '@/features/admin/presentation/ui/TableCard';
import { repeatRate } from '../domain/reportStats';
import ReportRangeSelect from './ReportRangeSelect';
import ReportError from './ReportError';

const PAGE_SIZE = 20;

export default function CustomerInsightsPage() {
  const { orders, loading, error, reload } = useAdminData();
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const firstLoad = loading && orders.length === 0;
  const insights = useMemo(() => customerInsights(orders, lastNDays(days)), [orders, days]);
  const pageData = paginate(insights.topSpenders, page, PAGE_SIZE);
  const active = insights.newCustomers + insights.returningCustomers;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Customer Insights"
        subtitle="New versus returning customers and top spenders."
        actions={<ReportRangeSelect days={days} onChange={(d) => { setDays(d); setPage(1); }} />}
      />
      {firstLoad ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : (
        <>
          <ReportError error={error} onRetry={reload} />
          <StatsRow>
            <StatCard icon={<UserPlus className="h-5 w-5" />} label="New customers" value={insights.newCustomers} />
            <StatCard icon={<Repeat className="h-5 w-5" />} label="Returning customers" value={insights.returningCustomers} />
            <StatCard icon={<Users className="h-5 w-5" />} label="Active customers" value={active} />
            <StatCard icon={<Percent className="h-5 w-5" />} label="Repeat rate" value={`${repeatRate(insights.newCustomers, insights.returningCustomers)}%`} caption="Returning of active" />
          </StatsRow>
          {insights.topSpenders.length === 0 ? (
            !error && <EmptyState icon={Users} title="No customer activity" description="No customers ordered in this period." />
          ) : (
            <TableCard>
              <div className="border-b border-[#EEEEEE] px-5 py-4 text-base font-bold text-black">Top Spenders</div>
              <TableScroll
                minWidth="min-w-[480px]"
                head={<><Th className="pl-5">Name</Th><Th>Orders</Th><Th className="pr-5 text-right">Total spent</Th></>}
              >
                {pageData.items.map((c) => (
                  <tr key={c.key} className={TABLE_ROW}>
                    <td className="py-3 pl-5 pr-3 font-medium text-black">{c.name}</td>
                    <td className="px-3">{c.orderCount}</td>
                    <td className="py-3 pl-3 pr-5 text-right font-medium">{formatCurrency(c.totalSpent)}</td>
                  </tr>
                ))}
              </TableScroll>
              <div className="flex justify-end border-t border-[#EEEEEE] p-4">
                <Pagination from={pageData.from} to={pageData.to} total={pageData.total} page={pageData.page} totalPages={pageData.totalPages} onPage={setPage} />
              </div>
            </TableCard>
          )}
        </>
      )}
    </div>
  );
}
