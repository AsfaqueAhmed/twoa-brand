'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxHeightClass?: string;
};

export default function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  maxHeightClass = 'max-h-[78vh]',
}: Props) {
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
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-50 flex w-full flex-col rounded-t-3xl bg-white shadow-2xl transition-transform animate-in slide-in-from-bottom duration-250 ease-out ${maxHeightClass}`}
      >
        {/* Drag handle */}
        <div className="flex w-full justify-center pt-3 pb-1" onClick={onClose}>
          <div className="h-1.5 w-12 rounded-full bg-zinc-300 cursor-pointer" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <h2 className="text-base font-bold tracking-tight text-black">{title}</h2>
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
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
