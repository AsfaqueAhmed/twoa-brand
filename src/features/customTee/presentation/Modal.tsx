'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type Props = { onClose: () => void; title: string; children: React.ReactNode };

export default function Modal({ onClose, title, children }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Latest onClose without re-running the mount effect (which would reset focus and the saved overflow value).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      {/* One fixed width for every step so the dialog never jumps between steps. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-lg bg-white sm:rounded-lg shadow-[0_24px_64px_rgba(0,0,0,0.18)] sm:w-[640px]"
      >
        <button
          ref={closeRef}
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-black hover:bg-[#F5F5F5]"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-1 flex-col overflow-y-auto px-6 pt-10 sm:min-h-[600px] sm:px-8">{children}</div>
      </div>
    </div>
  );
}
