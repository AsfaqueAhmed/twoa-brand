'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

type Props = { title: string; onClose: () => void; busy?: boolean; children: React.ReactNode };

// Portal dialog: Escape + backdrop close (ignored while busy), focuses the first control on open.
export default function ModalShell({ title, onClose, busy = false, children }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('select, input, button:not([data-close])')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busyRef.current && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1A1A1A]/40" onClick={() => { if (!busy) onClose(); }} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-xl border border-[#EEEEEE] bg-white p-6 shadow-2xl"
      >
        <h3 id={titleId} className="mb-4 text-base font-bold text-black">{title}</h3>
        {children}
      </div>
    </div>,
    document.body
  );
}
