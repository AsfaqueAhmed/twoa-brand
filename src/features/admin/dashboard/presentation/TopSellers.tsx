import type { TopProduct } from '@/features/admin/analytics/domain/analytics';
import { ThumbImage } from '@/shared/ui/ThumbImage';

export default function TopSellers({ items }: { items: TopProduct[] }) {
  if (items.length === 0) return <p className="text-sm text-[#717171]">No sales in this period.</p>;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((p, i) => (
        <div key={p.productId}>
          <div className="relative aspect-[4/5] overflow-hidden rounded bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <ThumbImage src={p.image} alt={p.name} className="h-full w-full object-cover" />
            <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs font-bold text-white">{i + 1}</span>
          </div>
          <div className="mt-2 truncate text-sm font-medium">{p.name}</div>
          <div className="text-xs font-semibold">{p.sold} sold</div>
        </div>
      ))}
    </div>
  );
}
