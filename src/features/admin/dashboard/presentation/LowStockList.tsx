import Link from 'next/link';
import type { StockProduct } from '@/features/admin/analytics/domain/analytics';
import { ThumbImage } from '@/shared/ui/ThumbImage';

export default function LowStockList({ items }: { items: StockProduct[] }) {
  if (items.length === 0) return <p className="text-sm text-[#717171]">All products are well stocked.</p>;
  return (
    <ul className="divide-y divide-[#EEEEEE]">
      {items.map((p) => (
        <li key={p.id} className="flex items-center gap-3 py-2.5">
          <ThumbImage src={p.image} alt="" className="h-11 w-11 rounded object-cover" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{p.name}</div>
            <div className={`text-xs font-semibold ${p.stock === 0 ? 'text-red-600' : p.stock <= 10 ? 'text-amber-600' : 'text-emerald-600'}`}>{p.stock} in stock</div>
          </div>
          <Link href="/admin/products" className="rounded border border-[#EEEEEE] px-3 py-1.5 text-xs font-medium hover:border-black">Edit</Link>
        </li>
      ))}
    </ul>
  );
}
