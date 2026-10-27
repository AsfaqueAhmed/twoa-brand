import type { OrderStatus } from '@/shared/domain/types';
import { STATUS_LABELS, STATUS_ORDER } from '@/features/admin/analytics/domain/analytics';

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#f59e0b', confirmed: '#2563eb', out_for_delivery: '#6366f1', delivered: '#16a34a', cancelled: '#dc2626',
};

export default function StatusDonut({ counts }: { counts: Record<OrderStatus, number> }) {
  const total = STATUS_ORDER.reduce((s, k) => s + counts[k], 0);
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label="Orders by status">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#EEEEEE" strokeWidth="16" />
        {total > 0 && STATUS_ORDER.map((k) => {
          const len = (counts[k] / total) * C;
          const el = (
            <circle key={k} cx="70" cy="70" r={R} fill="none" stroke={STATUS_COLORS[k]} strokeWidth="16"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
        <g className="rotate-90 origin-center">
          <text x="70" y="70" textAnchor="middle" fontSize="22" fontWeight="bold">{total}</text>
          <text x="70" y="86" textAnchor="middle" fontSize="9" fill="#717171">Total Orders</text>
        </g>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {STATUS_ORDER.map((k) => (
          <li key={k} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[k] }} />
            <span className="flex-1 text-[#717171]">{STATUS_LABELS[k]}</span>
            <span className="font-semibold">{counts[k]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
