'use client';

import { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import AdminCard from '@/features/admin/presentation/AdminCard';
import EmptyState from '@/shared/ui/EmptyState';
import Spinner from '@/shared/ui/Spinner';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import { listReturns, createReturn, updateReturnStatus } from '../infrastructure/orderReturnsRepository';
import { NEXT_RETURN_STATUSES, RETURN_STATUS_LABELS, type OrderReturn, type ReturnStatus } from '../domain/orderReturn';

const BADGE: Record<ReturnStatus, string> = {
  requested: 'bg-amber-50 text-amber-800',
  approved: 'bg-blue-50 text-blue-800',
  rejected: 'bg-red-50 text-red-800',
  refunded: 'bg-green-50 text-green-800',
};

export default function OrderReturnsPage() {
  const { orders } = useAdminData();
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [orderInput, setOrderInput] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = orderInput.trim().replace(/^#/, '');
    const order = v ? orders.find((o) => o.id === v || o.id.endsWith(v)) : undefined;
    if (!order) {
      setFormError('No order matches that number.');
      return;
    }
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
    try {
      await updateReturnStatus(id, status);
      await load();
    } catch {
      alert('Failed to update return.');
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Order Returns"
        subtitle="Track return requests and refunds."
        actions={
          <button type="button" onClick={() => setShowForm((s) => !s)}
            className="rounded-md bg-black px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">
            Log Return
          </button>
        }
      />
      {showForm && (
        <AdminCard>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label htmlFor="return-order" className="mb-1 block text-xs font-medium text-[#717171]">Order number</label>
              <input id="return-order" value={orderInput} onChange={(e) => setOrderInput(e.target.value)}
                placeholder="Full order id or last 8 characters"
                className="w-full max-w-sm rounded-md border border-[#EEEEEE] px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="return-reason" className="mb-1 block text-xs font-medium text-[#717171]">Reason</label>
              <textarea id="return-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                className="w-full max-w-lg rounded-md border border-[#EEEEEE] px-3 py-2 text-sm" />
            </div>
            {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
            <button type="submit" disabled={submitting}
              className="rounded-md bg-black px-4 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50">
              {submitting ? 'Saving...' : 'Submit'}
            </button>
          </form>
        </AdminCard>
      )}
      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {error} <button type="button" onClick={load} className="font-bold underline">Retry</button>
        </div>
      ) : returns.length === 0 ? (
        <EmptyState icon={RotateCcw} title="No returns yet" description="Logged returns will appear here." />
      ) : (
        <AdminCard>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-[#717171]">
                <tr><th className="py-2 font-medium">Order</th><th className="font-medium">Reason</th><th className="font-medium">Status</th><th className="font-medium">Date</th><th className="font-medium">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE]">
                {returns.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 font-medium">#{r.orderId.slice(-8)}</td>
                    <td className="max-w-xs">{r.reason || '—'}</td>
                    <td><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[r.status]}`}>{RETURN_STATUS_LABELS[r.status]}</span></td>
                    <td className="text-[#717171]">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        {NEXT_RETURN_STATUSES(r.status).map((s) => (
                          <button key={s} type="button" onClick={() => changeStatus(r.id, s)}
                            className="rounded-md border border-[#EEEEEE] px-2 py-1 text-xs font-medium hover:bg-[#F5F5F5]">
                            {RETURN_STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </td>
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
