import { AlertTriangle, Boxes, Layers, PackageX } from 'lucide-react';
import StatCard from '@/features/admin/inventory/presentation/list/StatCard';
import type { parentStats } from '../../domain/parentList';

type Stats = ReturnType<typeof parentStats>;

export default function ParentStatsRow({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={<Layers className="h-5 w-5" />} label="Parent Products" value={stats.total} />
      <StatCard icon={<Boxes className="h-5 w-5" />} label="Total Stock" value={stats.totalStock} note="units across all sizes" />
      <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Low Stock" value={stats.low} dot="bg-amber-500" note={`${stats.lowPct}% of total`} />
      <StatCard icon={<PackageX className="h-5 w-5" />} label="Out of Stock" value={stats.out} dot="bg-red-500" note={`${stats.outPct}% of total`} />
    </div>
  );
}
