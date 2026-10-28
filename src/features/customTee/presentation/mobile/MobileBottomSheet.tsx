'use client';

import { createContext, useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** The sheet's pinned footer element; content portalled here stays fixed below the scrolling body. */
export const SheetFooterContext = createContext<HTMLElement | null>(null);

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxHeightClass?: string;
  /** false: no dimming backdrop and the canvas above stays interactive, so edits are visible live. */
  modal?: boolean;
};

export default function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  maxHeightClass = 'max-h-[78dvh]',
  modal = true,
}: Props) {
  const [footerEl, setFooterEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-40 flex flex-col justify-end ${modal ? '' : 'pointer-events-none'}`}>
      {modal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal={modal}
        aria-label={title}
        className={`pointer-events-auto relative z-50 flex w-full flex-col rounded-t-3xl bg-white ${modal ? 'shadow-2xl' : 'border-t border-zinc-200 shadow-[0_-10px_30px_rgba(0,0,0,0.12)]'} transition-transform animate-in slide-in-from-bottom duration-250 ease-out ${maxHeightClass}`}
      >
        {/* Drag handle */}
        <div className="flex w-full justify-center pt-2.5 pb-0.5" onClick={onClose}>
          <div className="h-1.5 w-12 rounded-full bg-zinc-300 cursor-pointer" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-2">
          <h2 className="text-sm font-bold tracking-tight text-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-black active:scale-95 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 py-4 min-h-0 [-webkit-overflow-scrolling:touch]">
          <SheetFooterContext.Provider value={footerEl}>{children}</SheetFooterContext.Provider>
        </div>

        {/* Pinned footer (e.g. Apply Changes); hidden while empty */}
        <div ref={setFooterEl} className="shrink-0 border-t border-zinc-100 bg-white px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] empty:hidden" />
      </div>
    </div>
  );
}
