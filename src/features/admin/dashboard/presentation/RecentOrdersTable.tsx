import type { Order, OrderStatus } from '@/shared/domain/types';
import { STATUS_LABELS } from '@/features/admin/analytics/domain/analytics';
import { formatCurrency } from '@/shared/lib/formatCurrency';

const BADGE: Record<OrderStatus, string> = {
  pending: 'bg-red-50 text-red-700', confirmed: 'bg-amber-50 text-amber-800',
  out_for_delivery: 'bg-blue-50 text-blue-700', delivered: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-neutral-100 text-neutral-600',
};

export default function RecentOrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) return <p className="text-sm text-[#717171]">No orders in this period.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs text-[#717171]">
          <tr><th scope="col" className="py-2 font-medium">#</th><th scope="col" className="font-medium">Customer</th><th scope="col" className="font-medium">Items</th><th scope="col" className="font-medium">Amount</th><th scope="col" className="font-medium">Status</th><th scope="col" className="font-medium">Date</th></tr>
        </thead>
        <tbody className="divide-y divide-[#EEEEEE]">
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="py-3 font-medium">#{o.id.slice(-8)}</td>
              <td>{o.userName}</td>
              <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
              <td>{formatCurrency(o.totalAmount)}</td>
              <td><span className={`rounded px-2 py-1 text-xs font-medium ${BADGE[o.status]}`}>{STATUS_LABELS[o.status]}</span></td>
              <td className="text-[#717171]">{new Date(o.createdAt).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
