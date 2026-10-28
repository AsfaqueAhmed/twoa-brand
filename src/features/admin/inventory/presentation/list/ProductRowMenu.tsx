'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, MoreHorizontal, RefreshCw, Split, Trash2 } from 'lucide-react';
import type { Product } from '@/shared/domain/types';

type Props = {
  product: Product;
  splitting: boolean;
  onDuplicate: (p: Product) => void;
  onSplit: (p: Product) => void;
  onDelete: (p: Product) => void;
};

export default function ProductRowMenu({ product, splitting, onDuplicate, onSplit, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = 'flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-[#FAF9F6] disabled:opacity-40';
  const run = (fn: (p: Product) => void) => () => {
    setOpen(false);
    fn(product);
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        aria-label={`More actions for ${product.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-[#EEEEEE] bg-white p-2 text-black hover:border-black"
        id={`admin-more-prod-btn-${product.id}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-[#EEEEEE] bg-white py-1 shadow-lg">
          <button type="button" role="menuitem" className={`${item} text-black`} onClick={run(onDuplicate)} id={`admin-duplicate-prod-btn-${product.id}`}>
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </button>
          {product.variants && product.variants.length > 0 && (
            <button type="button" role="menuitem" className={`${item} text-black`} disabled={splitting} onClick={run(onSplit)} id={`admin-split-prod-btn-${product.id}`}>
              {splitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Split className="h-3.5 w-3.5" />} Split variants
            </button>
          )}
          <button type="button" role="menuitem" className={`${item} text-red-600`} onClick={run(onDelete)} id={`admin-delete-prod-btn-${product.id}`}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
