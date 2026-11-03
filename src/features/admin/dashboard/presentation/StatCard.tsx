import { ArrowUp, ArrowDown, type LucideIcon } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, change }: { icon: LucideIcon; label: string; value: string; change: number | null }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-[#EEEEEE] bg-white p-5 max-sm:flex-col max-sm:items-start max-sm:gap-2 max-sm:p-3.5">
      <div className="flex h-12 w-12 max-sm:h-9 max-sm:w-9 items-center justify-center rounded-lg border border-[#EEEEEE]"><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <div className="text-sm text-[#717171] max-sm:text-xs">{label}</div>
        <div className="truncate text-3xl font-bold max-sm:text-xl text-black">{value}</div>
        <div className="text-xs text-[#717171]">
          {change === null ? (
            'No previous data'
          ) : (
            <span className={`inline-flex items-center gap-0.5 font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(change)}%
            </span>
          )}{' '}
          {change !== null && 'vs previous period'}
        </div>
      </div>
    </div>
  );
}
