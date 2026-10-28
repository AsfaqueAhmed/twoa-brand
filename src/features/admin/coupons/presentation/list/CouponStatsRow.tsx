import { BarChart3, CheckCircle2, Ticket, TimerOff } from 'lucide-react';
import StatCard from '@/features/admin/presentation/ui/StatCard';
import StatsRow from '@/features/admin/presentation/ui/StatsRow';
import type { couponStats } from '../../domain/couponList';

export default function CouponStatsRow({ stats }: { stats: ReturnType<typeof couponStats> }) {
  return (
    <StatsRow>
      <StatCard icon={<Ticket className="h-5 w-5" />} label="Total Coupons" value={stats.total} />
      <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Active" value={stats.active} tone="green" caption="usable right now" />
      <StatCard icon={<TimerOff className="h-5 w-5" />} label="Expired" value={stats.expired} tone="red" />
      <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Total Redemptions" value={stats.redemptions} caption="across all coupons" />
    </StatsRow>
  );
}
