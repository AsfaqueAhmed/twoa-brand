import { AlertTriangle, Box, CheckCircle2, PackageX } from 'lucide-react';
import StatCard from '@/features/admin/presentation/ui/StatCard';
import StatsRow from '@/features/admin/presentation/ui/StatsRow';
import type { productStats } from '../../domain/productList';

type Stats = ReturnType<typeof productStats>;

export default function ProductStatsRow({ stats }: { stats: Stats }) {
  return (
    <StatsRow>
      <StatCard icon={<Box className="h-5 w-5" />} label="Total Products" value={stats.total} />
      <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Active Products" value={stats.active} tone="green" caption={`${stats.activePct}% of total`} />
      <StatCard icon={<PackageX className="h-5 w-5" />} label="Out of Stock" value={stats.out} tone="red" caption={`${stats.outPct}% of total`} />
      <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Low Stock" value={stats.low} tone="amber" caption={`${stats.lowPct}% of total`} />
    </StatsRow>
  );
}
