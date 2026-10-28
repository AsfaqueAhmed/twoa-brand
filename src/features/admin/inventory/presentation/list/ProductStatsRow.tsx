import { AlertTriangle, Box, CheckCircle2, PackageX } from 'lucide-react';
import StatCard from './StatCard';
import type { productStats } from '../../domain/productList';

type Stats = ReturnType<typeof productStats>;

export default function ProductStatsRow({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={<Box className="h-5 w-5" />} label="Total Products" value={stats.total} />
      <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Active Products" value={stats.active} dot="bg-emerald-500" note={`${stats.activePct}% of total`} />
      <StatCard icon={<PackageX className="h-5 w-5" />} label="Out of Stock" value={stats.out} dot="bg-red-500" note={`${stats.outPct}% of total`} />
      <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Low Stock" value={stats.low} dot="bg-amber-500" note={`${stats.lowPct}% of total`} />
    </div>
  );
}
