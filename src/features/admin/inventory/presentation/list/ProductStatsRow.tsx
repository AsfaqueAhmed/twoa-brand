import { AlertTriangle, Box, CheckCircle2, PackageX } from 'lucide-react';
import type { productStats } from '../../domain/productList';

type Stats = ReturnType<typeof productStats>;

function Card({ icon, label, value, note, dot }: { icon: React.ReactNode; label: string; value: number; note?: string; dot?: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#EEEEEE] bg-white p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#EEEEEE] bg-[#FAF9F6] text-black">
        {icon}
      </div>
      <div>
        <div className="text-xs text-[#717171]">{label}</div>
        <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-black">
          {dot && <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />}
          {value}
        </div>
        {note && <div className="mt-0.5 text-xs text-[#919191]">{note}</div>}
      </div>
    </div>
  );
}

export default function ProductStatsRow({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card icon={<Box className="h-5 w-5" />} label="Total Products" value={stats.total} />
      <Card icon={<CheckCircle2 className="h-5 w-5" />} label="Active Products" value={stats.active} dot="bg-emerald-500" note={`${stats.activePct}% of total`} />
      <Card icon={<PackageX className="h-5 w-5" />} label="Out of Stock" value={stats.out} dot="bg-red-500" note={`${stats.outPct}% of total`} />
      <Card icon={<AlertTriangle className="h-5 w-5" />} label="Low Stock" value={stats.low} dot="bg-amber-500" note={`${stats.lowPct}% of total`} />
    </div>
  );
}
