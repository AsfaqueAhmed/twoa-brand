import { Edit2, Star } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { productStatus, productTotalStock } from '../../domain/productList';
import ProductStatusPill from './ProductStatusPill';
import ProductRowMenu from './ProductRowMenu';
import StockBar from './StockBar';
import type { ProductsListProps } from './ProductsTable';
import { ThumbImage } from '@/shared/ui/ThumbImage';

export default function ProductsGrid(props: ProductsListProps) {
  const selected = new Set(props.selectedIds);
  if (props.products.length === 0) {
    return <div className="py-12 text-center text-sm font-semibold text-[#717171]">No products found matching your filters.</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-3 xl:grid-cols-4">
      {props.products.map((p) => (
        <div key={p.id} className={`relative flex flex-col overflow-hidden rounded-xl border bg-white ${selected.has(p.id) ? 'border-black' : 'border-[#EEEEEE]'}`}>
          <input
            type="checkbox"
            aria-label={`Select ${p.name}`}
            checked={selected.has(p.id)}
            onChange={() => props.onToggle(p.id)}
            className="absolute left-3 top-3 z-10 h-4 w-4 accent-black"
          />
          <button
            type="button"
            aria-label={p.isFeatured ? `Unfeature ${p.name}` : `Feature ${p.name}`}
            aria-pressed={!!p.isFeatured}
            disabled={props.featuredPendingIds.includes(p.id)}
            onClick={() => props.onToggleFeatured(p, !p.isFeatured)}
            className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 shadow disabled:opacity-50"
          >
            <Star className={`h-4 w-4 ${p.isFeatured ? 'fill-amber-400 text-amber-500' : 'text-[#717171]'}`} />
          </button>
          <ThumbImage src={p.image} alt={p.name} className="aspect-[4/5] w-full bg-[#F5F5F5] object-cover" referrerPolicy="no-referrer" loading="lazy" />
          <div className="flex flex-1 flex-col gap-2 p-3.5">
            <div className="truncate text-sm font-semibold text-black">{p.name}</div>
            <div className="text-sm font-semibold text-black">
              {formatCurrency(p.price)}
              {p.originalPrice ? <span className="ml-2 text-xs font-normal text-[#919191] line-through">{formatCurrency(p.originalPrice)}</span> : null}
            </div>
            <StockBar total={productTotalStock(p)} />
            <div><ProductStatusPill status={productStatus(p)} /></div>
            <div className="mt-auto flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => props.onEdit(p)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#EEEEEE] bg-white px-3 py-2 text-sm font-medium text-black hover:border-black"
              >
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </button>
              <ProductRowMenu
                product={p}
                splitting={props.splittingProductId === p.id}
                onDuplicate={props.onDuplicate}
                onSplit={props.onSplit}
                onDelete={props.onDelete}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
