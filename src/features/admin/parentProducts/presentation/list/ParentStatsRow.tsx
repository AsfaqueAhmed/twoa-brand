import { AlertTriangle, Boxes, Layers, PackageX } from 'lucide-react';
import StatCard from '@/features/admin/presentation/ui/StatCard';
import StatsRow from '@/features/admin/presentation/ui/StatsRow';
import type { parentStats } from '../../domain/parentList';

type Stats = ReturnType<typeof parentStats>;

export default function ParentStatsRow({ stats }: { stats: Stats }) {
  return (
    <StatsRow>
      <StatCard icon={<Layers className="h-5 w-5" />} label="Parent Products" value={stats.total} />
      <StatCard icon={<Boxes className="h-5 w-5" />} label="Total Stock" value={stats.totalStock} caption="units across all sizes" />
      <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Low Stock" value={stats.low} tone="amber" caption={`${stats.lowPct}% of total`} />
      <StatCard icon={<PackageX className="h-5 w-5" />} label="Out of Stock" value={stats.out} tone="red" caption={`${stats.outPct}% of total`} />
    </StatsRow>
  );
}
