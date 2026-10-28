import { stockBarPercent, stockLevel } from '../../domain/productList';

export default function StockBar({ total }: { total: number | null }) {
  const level = stockLevel(total);
  const color = level === 'in' ? 'bg-emerald-500' : 'bg-red-500';
  return (
    <div className="min-w-[110px]">
      <div className={`text-sm font-medium ${level === 'in' ? 'text-black' : level === 'low' ? 'text-amber-600' : 'text-red-600'}`}>
        {total === null ? '—' : total}
      </div>
      <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-[#EEEEEE]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${stockBarPercent(total)}%` }} />
      </div>
    </div>
  );
}
