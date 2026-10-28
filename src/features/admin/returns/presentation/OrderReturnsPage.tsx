'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, RotateCcw, Undo2, XCircle } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import EmptyState from '@/shared/ui/EmptyState';
import Spinner from '@/shared/ui/Spinner';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import { formatPlacedOn } from '@/features/admin/orders/domain/orderView';
import { paginate } from '@/features/admin/inventory/domain/productList';
import StatCard from '@/features/admin/presentation/ui/StatCard';
import StatsRow from '@/features/admin/presentation/ui/StatsRow';
import FilterBar from '@/features/admin/presentation/ui/FilterBar';
import { FilterSearch, FilterSelect } from '@/features/admin/presentation/ui/FilterControls';
import ErrorBanner from '@/features/admin/presentation/ui/ErrorBanner';
import Pagination from '@/features/admin/presentation/ui/Pagination';
import StatusPill from '@/features/admin/presentation/ui/StatusPill';
import ModalShell from '@/features/admin/presentation/ui/ModalShell';
import type { Tone } from '@/features/admin/presentation/ui/tones';
import { TABLE_ROW, TableCard, TableScroll, Th } from '@/features/admin/presentation/ui/TableCard';
import { listReturns, createReturn, updateReturnStatus } from '../infrastructure/orderReturnsRepository';
import { NEXT_RETURN_STATUSES, RETURN_STATUS_LABELS, resolveOrderByNumber, type OrderReturn, type ReturnStatus } from '../domain/orderReturn';
import {
  DEFAULT_RETURN_FILTERS,
  activeReturnFilterCount,
  filterReturns,
  returnStats,
  shortOrderId,
  type ReturnFilters,
  type ReturnStatusFilter,
} from '../domain/returnList';

const PAGE_SIZE = 20;
const TONE: Record<ReturnStatus, Tone> = { requested: 'amber', approved: 'blue', rejected: 'red', refunded: 'green' };
const ICON: Record<ReturnStatus, React.ReactNode> = {
  requested: <Clock className="h-5 w-5" />,
  approved: <CheckCircle2 className="h-5 w-5" />,
  rejected: <XCircle className="h-5 w-5" />,
  refunded: <Undo2 className="h-5 w-5" />,
};
const STATUSES: ReturnStatus[] = ['requested', 'approved', 'rejected', 'refunded'];
const INPUT = 'w-full rounded-lg border border-[#EEEEEE] px-3 py-2 text-sm focus:border-black focus:outline-none';

export default function OrderReturnsPage() {
  const { orders, loading: ordersLoading, error: ordersError, reload: reloadOrders } = useAdminData();
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [orderInput, setOrderInput] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState<ReturnFilters>(DEFAULT_RETURN_FILTERS);
  const [page, setPage] = useState(1);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [error]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReturns(await listReturns());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load returns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => returnStats(returns), [returns]);
  const rows = useMemo(() => filterReturns(returns, filters), [returns, filters]);
  const pageData = paginate(rows, page, PAGE_SIZE);
  const activeCount = activeReturnFilterCount(filters);
  const firstLoad = loading && returns.length === 0;

  const update = (f: ReturnFilters) => {
    setFilters(f);
    setPage(1);
  };

  const closeForm = () => {
    setShowForm(false);
    setFormError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolved = resolveOrderByNumber(orders, orderInput);
    if ('error' in resolved) {
      setFormError(resolved.error);
      return;
    }
    const order = resolved.order;
    setFormError(null);
    setSubmitting(true);
    try {
      await createReturn(order.id, reason.trim());
      setOrderInput('');
      setReason('');
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to log return.');
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (id: string, status: ReturnStatus) => {
    setActionError(null);
    try {
      await updateReturnStatus(id, status);
      await load();
    } catch {
      setActionError('Failed to update return.');
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Order Returns"
        subtitle="Track return requests and refunds."
        actions={
          <button type="button" onClick={() => setShowForm(true)} id="admin-log-return-btn"
            className="rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333333]">
            Log Return
          </button>
        }
      />
      {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}
      {firstLoad ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : (
        <>
          {error && !(returns.length > 0 && dismissed) && (
            <ErrorBanner message={error} onRetry={load} onDismiss={returns.length > 0 ? () => setDismissed(true) : undefined} />
          )}
          {returns.length === 0 ? (
            !error && <EmptyState icon={RotateCcw} title="No returns yet" description="Logged returns will appear here." />
          ) : (
            <>
          <StatsRow>
            {STATUSES.map((s) => (
              <StatCard key={s} icon={ICON[s]} label={RETURN_STATUS_LABELS[s]} value={stats[s]} tone={TONE[s]} />
            ))}
          </StatsRow>
          <FilterBar activeCount={activeCount} onReset={() => update(DEFAULT_RETURN_FILTERS)}>
            <FilterSearch
              id="admin-return-search"
              value={filters.search}
              onChange={(search) => update({ ...filters, search })}
              placeholder="Search order number or reason..."
            />
            <FilterSelect aria-label="Status" value={filters.status} onChange={(e) => update({ ...filters, status: e.target.value as ReturnStatusFilter })}>
              <option value="">Status: All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{RETURN_STATUS_LABELS[s]}</option>)}
            </FilterSelect>
          </FilterBar>
          <TableCard>
            <TableScroll
              minWidth="min-w-[760px]"
              head={
                <>
                  <Th className="pl-5">Order</Th>
                  <Th>Reason</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                  <Th>Actions</Th>
                </>
              }
            >
              {pageData.items.map((r) => (
                <tr key={r.id} className={TABLE_ROW}>
                  <td className="py-3 pl-5 pr-3 font-medium text-black">{shortOrderId(r.orderId)}</td>
                  <td className="max-w-xs truncate px-3" title={r.reason || undefined}>{r.reason || '—'}</td>
                  <td className="px-3"><StatusPill tone={TONE[r.status]}>{RETURN_STATUS_LABELS[r.status]}</StatusPill></td>
                  <td className="whitespace-nowrap px-3 text-[#717171]">{formatPlacedOn(r.createdAt)}</td>
                  <td className="px-3">
                    <div className="flex gap-2">
                      {NEXT_RETURN_STATUSES(r.status).map((s) => (
                        <button key={s} type="button" onClick={() => changeStatus(r.id, s)}
                          className="rounded-lg border border-[#EEEEEE] bg-white px-3 py-1.5 text-xs font-medium hover:border-black">
                          {RETURN_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-[#717171]">No returns match your filters.</td></tr>
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
      {showForm && (
        <ModalShell title="Log Return" onClose={closeForm} busy={submitting}>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label htmlFor="return-order" className="mb-1 block text-xs font-medium text-[#717171]">Order number</label>
              <input id="return-order" value={orderInput} onChange={(e) => setOrderInput(e.target.value)}
                placeholder="Full order id or last 8 characters" className={INPUT} />
            </div>
            <div>
              <label htmlFor="return-reason" className="mb-1 block text-xs font-medium text-[#717171]">Reason</label>
              <textarea id="return-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={INPUT} />
            </div>
            {ordersError ? (
              <p role="alert" className="text-sm text-red-700">
                Could not load orders: {ordersError}{' '}
                <button type="button" onClick={reloadOrders} className="font-bold underline">Retry</button>
              </p>
            ) : formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" data-close onClick={closeForm} disabled={submitting}
                className="rounded-lg border border-[#EEEEEE] px-4 py-2 text-sm font-medium hover:border-black">Cancel</button>
              <button type="submit" disabled={submitting || ordersLoading || !!ordersError}
                className="rounded-lg bg-black px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {submitting ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
