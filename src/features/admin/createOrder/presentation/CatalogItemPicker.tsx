'use client';

import { useMemo, useState } from 'react';
import type { CartItem, Product } from '@/shared/domain/types';

const INPUT = 'w-full rounded-md border border-[#EEEEEE] bg-white px-3 py-2 text-sm focus:border-black focus:outline-none';

export default function CatalogItemPicker({ products, onAdd }: { products: Product[]; onAdd: (item: CartItem) => void }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [size, setSize] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return products.filter((p) => p.name.toLowerCase().includes(needle)).slice(0, 8);
  }, [products, q]);

  const parent = selected?.parentProduct;
  const stock = parent && size ? parent.stockBySize[size] ?? 0 : 0;

  const reset = () => {
    setSelected(null);
    setQ('');
    setSize('');
    setVariantId('');
    setQuantity('1');
  };

  const canAdd = !!selected && !!parent && !!size && stock > 0 && (!selected.variants?.length || !!variantId);

  const add = () => {
    if (!selected || !canAdd) return;
    const qty = Math.min(Math.max(1, Math.floor(Number(quantity) || 1)), stock);
    onAdd({
      product: selected,
      quantity: qty,
      selectedSize: size,
      selectedVariant: selected.variants?.find((v) => v.id === variantId),
    });
    reset();
  };

  return (
    <div className="space-y-3">
      {!selected ? (
        <div>
          <input className={INPUT} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products by name" />
          {matches.length > 0 && (
            <ul className="mt-2 divide-y divide-[#EEEEEE] rounded-md border border-[#EEEEEE]">
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(p)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#FAF9F6]"
                  >
                    <span>{p.name}</span>
                    <span className="text-xs text-[#717171]">৳{p.price}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q.trim() && matches.length === 0 && <p className="mt-2 text-xs text-[#717171]">No products match.</p>}
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-[#EEEEEE] p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{selected.name}</span>
            <button type="button" onClick={reset} className="text-xs underline">Change</button>
          </div>
          {!parent ? (
            <p className="text-xs text-red-700">No stock record — use a custom item.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_90px_auto] sm:items-end">
              <label className="text-xs text-[#717171]">
                Size
                <select className={INPUT} value={size} onChange={(e) => { setSize(e.target.value); setQuantity('1'); }}>
                  <option value="">Select size</option>
                  {parent.sizeOrder.map((s) => {
                    const left = parent.stockBySize[s] ?? 0;
                    return (
                      <option key={s} value={s} disabled={left <= 0}>
                        {s} ({left} left)
                      </option>
                    );
                  })}
                </select>
              </label>
              {selected.variants?.length ? (
                <label className="text-xs text-[#717171]">
                  Variant
                  <select className={INPUT} value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                    <option value="">Select variant</option>
                    {selected.variants.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div />
              )}
              <label className="text-xs text-[#717171]">
                Quantity
                <input
                  type="number"
                  min={1}
                  max={stock || undefined}
                  className={INPUT}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onBlur={() => stock > 0 && setQuantity(String(Math.min(Math.max(1, Math.floor(Number(quantity) || 1)), stock)))}
                />
              </label>
              <button
                type="button"
                onClick={add}
                disabled={!canAdd}
                className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Add item
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
