'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

type Props = { onClose: () => void; title: string; children: React.ReactNode };

export default function Modal({ onClose, title, children }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Latest onClose without re-running the mount effect (which would reset focus and the saved overflow value).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // The body's height follows its content and animates when the content changes (e.g. between steps).
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>();
  const [animate, setAnimate] = useState(false);
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    const frame = requestAnimationFrame(() => setAnimate(true)); // no transition on the first paint
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

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
      {/* One fixed width for every step; only the height adapts to the content. */}
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
        <div
          className={`overflow-y-auto ${animate ? 'transition-[height] duration-300 ease-in-out motion-reduce:transition-none' : ''}`}
          style={{ height }}
        >
          <div ref={contentRef} className="flex flex-col px-6 pt-10 sm:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
