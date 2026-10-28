'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type Item = { label: string; onSelect: () => void; danger?: boolean };

export default function DropdownMenu({ label, items, disabled }: { label: string; items: Item[]; disabled?: boolean }) {
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
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-[#EEEEEE] bg-white px-3.5 py-2 text-sm text-black hover:border-black disabled:cursor-not-allowed disabled:text-[#A1A1A1] disabled:hover:border-[#EEEEEE]"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-20 mt-2 w-44 rounded-lg border border-[#EEEEEE] bg-white py-1 shadow-lg">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-[#FAF9F6] ${it.danger ? 'text-red-600' : 'text-black'}`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
