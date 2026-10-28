import { Edit2 } from 'lucide-react';
import type { Product } from '@/shared/domain/types';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { productStatus, productTotalStock } from '../../domain/productList';
import ProductStatusPill from './ProductStatusPill';
import ProductRowMenu from './ProductRowMenu';
import FeaturedSwitch from './FeaturedSwitch';
import StockBar from './StockBar';

export type ProductsListProps = {
  products: Product[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAllOnPage: () => void;
  allOnPageSelected: boolean;
  someOnPageSelected: boolean;
  onEdit: (p: Product) => void;
  onDuplicate: (p: Product) => void;
  onSplit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onToggleFeatured: (p: Product, featured: boolean) => void;
  featuredPendingIds: string[];
  splittingProductId: string | null;
};

const MAX_DOTS = 3;
const MAX_SIZES = 4;

function Overflow({ n }: { n: number }) {
  return n > 0 ? <span className="text-[11px] font-medium text-[#717171]">+{n}</span> : null;
}

function ColorDots({ product }: { product: Product }) {
  const colors = (product.variants ?? []).map((v) => v.colorCode).filter((c): c is string => !!c);
  if (colors.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {colors.slice(0, MAX_DOTS).map((c, i) => (
        <span key={`${c}-${i}`} className="h-3.5 w-3.5 rounded-full border border-[#DDDDDD]" style={{ backgroundColor: c }} />
      ))}
      <Overflow n={colors.length - MAX_DOTS} />
    </div>
  );
}

function SizeChips({ product }: { product: Product }) {
  const sizes = product.parentProduct?.sizeOrder ?? [];
  if (sizes.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {sizes.slice(0, MAX_SIZES).map((s) => (
        <span key={s} className="rounded border border-[#E5E5E5] px-1.5 py-0.5 text-[10px] font-medium text-[#555555]">{s}</span>
      ))}
      <Overflow n={sizes.length - MAX_SIZES} />
    </div>
  );
}

export default function ProductsTable(props: ProductsListProps) {
  const { products, selectedIds, onToggle } = props;
  const selected = new Set(selectedIds);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#EEEEEE] bg-[#FAF9F6] text-xs font-medium text-[#555555]">
            <th className="w-12 py-3.5 pl-5 pr-2">
              <input
                type="checkbox"
                aria-label="Select all products on this page"
                checked={props.allOnPageSelected}
                ref={(el) => {
                  if (el) el.indeterminate = props.someOnPageSelected && !props.allOnPageSelected;
                }}
                onChange={props.onToggleAllOnPage}
                className="h-4 w-4 accent-black"
              />
            </th>
            <th className="px-3 py-3.5">Product</th>
            <th className="px-3 py-3.5">Category</th>
            <th className="px-3 py-3.5">Price</th>
            <th className="px-3 py-3.5">Stock (Total)</th>
            <th className="px-3 py-3.5">Status</th>
            <th className="px-3 py-3.5">Featured</th>
            <th className="px-3 py-3.5 pr-5">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEEEEE] text-sm text-[#1A1A1A]">
          {products.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-12 text-center font-semibold text-[#717171]">
                No products found matching your filters.
              </td>
            </tr>
          ) : (
            products.map((p) => {
              const total = productTotalStock(p);
              return (
                <tr key={p.id} className={`transition-colors hover:bg-[#FAF9F6]/60 ${selected.has(p.id) ? 'bg-[#FAF9F6]' : ''}`}>
                  <td className="py-3 pl-5 pr-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.name}`}
                      checked={selected.has(p.id)}
                      onChange={() => onToggle(p.id)}
                      className="h-4 w-4 accent-black"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-4">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-[66px] w-[52px] shrink-0 rounded-md border border-[#EEEEEE] bg-[#F5F5F5] object-cover"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      <div className="min-w-0 space-y-1.5">
                        <div className="max-w-[220px] truncate font-semibold text-black">{p.name}</div>
                        <ColorDots product={p} />
                        <SizeChips product={p} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-black">{p.category}</div>
                    {p.subcategory && <div className="text-xs text-[#919191]">{p.subcategory}</div>}
                  </td>
                  <td className="px-3 py-3 font-semibold text-black">
                    {formatCurrency(p.price)}
                    {p.originalPrice ? (
                      <div className="text-xs font-normal text-[#919191] line-through">{formatCurrency(p.originalPrice)}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3"><StockBar total={total} /></td>
                  <td className="px-3 py-3"><ProductStatusPill status={productStatus(p)} /></td>
                  <td className="px-3 py-3">
                    <FeaturedSwitch
                      checked={!!p.isFeatured}
                      label={`Featured: ${p.name}`}
                      disabled={props.featuredPendingIds.includes(p.id)}
                      onChange={(next) => props.onToggleFeatured(p, next)}
                    />
                  </td>
                  <td className="px-3 py-3 pr-5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => props.onEdit(p)}
                        id={`admin-edit-prod-btn-${p.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#EEEEEE] bg-white px-3.5 py-2 text-sm font-medium text-black hover:border-black"
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
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
