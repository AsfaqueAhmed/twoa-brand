import { formatRelativeTime, type ActivityEvent } from '@/features/admin/analytics/domain/analytics';

export default function RecentActivity({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-[#717171]">No activity yet.</p>;
  return (
    <ul className="divide-y divide-[#EEEEEE]">
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-3 py-2.5">
          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${e.kind === 'order' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
          <div className="min-w-0 flex-1">
            <div className="text-sm">{e.title}</div>
            <div className="text-xs text-[#717171]">{e.detail}</div>
          </div>
          <span className="shrink-0 text-xs text-[#717171]">{formatRelativeTime(e.at)}</span>
        </li>
      ))}
    </ul>
  );
}
