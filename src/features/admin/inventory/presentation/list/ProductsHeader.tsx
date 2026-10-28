'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Plus } from 'lucide-react';

export default function ProductsHeader({ onAdd }: { onAdd: () => void }) {
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

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">All Products</h1>
        <p className="mt-1 text-sm text-[#717171]">Manage your products, variants, stock and visibility.</p>
      </div>
      <div className="relative flex" ref={ref}>
        <button
          type="button"
          onClick={onAdd}
          id="admin-add-product-btn"
          className="flex items-center gap-2 rounded-l-lg bg-black px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333333]"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
        <button
          type="button"
          aria-label="More add options"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-r-lg border-l border-white/20 bg-black px-3 text-white transition-colors hover:bg-[#333333]"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        {open && (
          <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-[#EEEEEE] bg-white py-1 shadow-lg">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onAdd();
              }}
              className="block w-full px-4 py-2 text-left text-sm text-black hover:bg-[#FAF9F6]"
            >
              Add product
            </button>
            <Link
              href="/admin/parent-products"
              role="menuitem"
              className="block px-4 py-2 text-sm text-black hover:bg-[#FAF9F6]"
              onClick={() => setOpen(false)}
            >
              Parent products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
