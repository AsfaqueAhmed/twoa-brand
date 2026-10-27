'use client';

import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { Product } from '@/shared/domain/types';
import AdminCard from '@/features/admin/presentation/AdminCard';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { addCatalogLine, lineSubtotal, type DraftLine } from '../domain/adminOrder';
import CatalogItemPicker from './CatalogItemPicker';
import CustomItemForm from './CustomItemForm';

interface Props {
  products: Product[];
  lines: DraftLine[];
  onChange: (lines: DraftLine[]) => void;
}

export default function ItemsCard({ products, lines, onChange }: Props) {
  const [tab, setTab] = useState<'catalog' | 'custom'>('catalog');

  const setQty = (index: number, qty: number) => {
    if (qty < 1) return;
    onChange(
      lines.map((l, i) => {
        if (i !== index) return l;
        return l.kind === 'catalog' ? { kind: 'catalog', item: { ...l.item, quantity: qty } } : { ...l, quantity: qty };
      }),
    );
  };

  return (
    <AdminCard title="Items">
      <div className="mb-4 inline-flex rounded-lg border border-[#EEEEEE] bg-[#F5F5F5] p-1">
        {([['catalog', 'Catalog product'], ['custom', 'Custom item']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${tab === key ? 'bg-white text-black shadow-xs' : 'text-[#717171]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'catalog' ? (
        <CatalogItemPicker products={products} onAdd={(item) => onChange(addCatalogLine(lines, item))} />
      ) : (
        <CustomItemForm onAdd={(line) => onChange([...lines, line])} />
      )}

      <div className="mt-5">
        {lines.length === 0 ? (
          <p className="text-sm text-[#717171]">No items added yet.</p>
        ) : (
          <ul className="divide-y divide-[#EEEEEE]">
            {lines.map((l, i) => {
              const name = l.kind === 'catalog' ? l.item.product.name : l.name;
              const qty = l.kind === 'catalog' ? l.item.quantity : l.quantity;
              const detail =
                l.kind === 'catalog'
                  ? [l.item.selectedSize, l.item.selectedVariant?.name].filter(Boolean).join(' / ')
                  : 'Custom item';
              return (
                <li key={l.kind === 'custom' ? l.id : `${l.item.product.id}-${l.item.selectedSize}-${l.item.selectedVariant?.id ?? ''}`} className="flex items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{name}</p>
                    {detail && <p className="text-xs text-[#717171]">{detail}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Decrease quantity" onClick={() => setQty(i, qty - 1)} className="rounded border border-[#EEEEEE] p-1 hover:border-black">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center">{qty}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => setQty(i, qty + 1)} className="rounded border border-[#EEEEEE] p-1 hover:border-black">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="w-24 text-right font-medium">{formatCurrency(lineSubtotal(l))}</span>
                  <button type="button" aria-label="Remove item" onClick={() => onChange(lines.filter((_, j) => j !== i))} className="text-[#717171] hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminCard>
  );
}
