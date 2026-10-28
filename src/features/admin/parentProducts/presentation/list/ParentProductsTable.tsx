import { Edit2, Trash2 } from 'lucide-react';
import { TABLE_BODY, TABLE_HEAD_ROW, TABLE_ROW } from '@/features/admin/presentation/ui/TableCard';
import type { ParentProduct } from '@/shared/domain/types';
import { stockLevel, type ProductStatus } from '@/features/admin/inventory/domain/productList';
import ProductStatusPill from '@/features/admin/inventory/presentation/list/ProductStatusPill';
import StockBar from '@/features/admin/inventory/presentation/list/StockBar';
import { parentTotalStock } from '../../domain/parentList';

type Props = {
  parents: ParentProduct[];
  /** null when products failed to load: linked counts are unknown. */
  linked: Map<string, number> | null;
  onEdit: (pp: ParentProduct) => void;
  onDelete: (pp: ParentProduct) => void;
  /** Shown when there are no rows. */
  emptyText?: string;
};

function SizeChips({ pp }: { pp: ParentProduct }) {
  if (pp.sizeOrder.length === 0) return <span className="text-xs text-[#919191]">No sizes</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {pp.sizeOrder.map((s) => {
        const n = Number(pp.stockBySize[s]) || 0;
        const tone =
          stockLevel(n) === 'out'
            ? 'border-red-200 bg-red-50 text-red-700'
            : stockLevel(n) === 'low'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-[#E5E5E5] text-[#555555]';
        return (
          <span key={s} className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>
            {s} {n}
          </span>
        );
      })}
    </div>
  );
}

export default function ParentProductsTable({ parents, linked, onEdit, onDelete, emptyText = 'No parent products found.' }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            <th className="w-20 py-3.5 pl-5 pr-2">Image</th>
            <th className="px-3 py-3.5">Parent Product</th>
            <th className="px-3 py-3.5">Sizes</th>
            <th className="px-3 py-3.5">Total Stock</th>
            <th className="px-3 py-3.5">Linked Products</th>
            <th className="px-3 py-3.5 pr-5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className={TABLE_BODY}>
          {parents.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center font-semibold text-[#717171]">
                {emptyText}
              </td>
            </tr>
          ) : (
            parents.map((pp) => {
              const total = parentTotalStock(pp);
              const level = stockLevel(total);
              const status: ProductStatus = level === 'in' ? 'active' : level;
              const count = linked ? (linked.get(pp.id) ?? 0) : null;
              const blocked = count !== null && count > 0;
              return (
                <tr key={pp.id} className={TABLE_ROW}>
                  <td className="py-3 pl-5 pr-2">
                    {pp.image ? (
                      <img
                        src={pp.image}
                        alt={pp.name}
                        className="h-12 w-12 rounded-md border border-[#EEEEEE] bg-[#F5F5F5] object-cover"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-md border border-dashed border-[#DDDDDD] bg-[#FAF9F6]" />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="max-w-[240px] truncate font-semibold text-black">{pp.name}</div>
                    <div className="mt-0.5 max-w-[240px] truncate font-mono text-[11px] text-[#919191]">{pp.id}</div>
                  </td>
                  <td className="px-3 py-3">
                    <SizeChips pp={pp} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <StockBar total={total} />
                      <ProductStatusPill status={status} />
                    </div>
                  </td>
                  <td className="px-3 py-3 font-medium">{count === null ? '—' : count}</td>
                  <td className="px-3 py-3 pr-5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(pp)}
                        title="Edit Parent Product"
                        aria-label={`Edit ${pp.name}`}
                        className="rounded-lg border border-[#EEEEEE] bg-white p-2 text-black transition-colors hover:border-black"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (blocked) return;
                          onDelete(pp);
                        }}
                        aria-disabled={blocked}
                        aria-describedby={blocked ? `delete-reason-${pp.id}` : undefined}
                        title={blocked ? `Unlink its ${count} products first` : 'Delete Parent Product'}
                        aria-label={`Delete ${pp.name}`}
                        className={`rounded-lg border border-red-200 bg-white p-2 text-red-600 transition-colors hover:bg-red-50 ${
                          blocked ? 'cursor-not-allowed opacity-40 hover:bg-white' : ''
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {blocked && (
                        <span id={`delete-reason-${pp.id}`} className="sr-only">
                          Cannot delete: {count} linked product{count === 1 ? '' : 's'} still use this parent product. Unlink them first.
                        </span>
                      )}
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
