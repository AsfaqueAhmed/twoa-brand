'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';

type Props = {
  title?: string;
  subtitle?: string;
  onBack: () => void;
  onSave: () => void;
  onRequestQuote?: () => void;
  quoteDisabled?: boolean;
  saving?: boolean;
};

export default function MobileHeader({
  title = 'Design Studio',
  subtitle,
  onBack,
  onSave,
  onRequestQuote,
  quoteDisabled = false,
  saving = false,
}: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between border-b border-[#EEEEEE] bg-white px-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black hover:bg-gray-100 active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold tracking-tight text-black">{title}</h1>
          {subtitle && (
            <p className="truncate text-[11px] font-medium text-[#717171]">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 pl-2">
        {onRequestQuote && (
          <button
            type="button"
            onClick={onRequestQuote}
            disabled={quoteDisabled}
            aria-label="Order now"
            title={quoteDisabled ? 'Add something to your design first' : undefined}
            className="flex items-center justify-center rounded-full bg-black px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-zinc-800 active:scale-95 disabled:bg-[#EEEEEE] disabled:text-[#9A9A9A] disabled:shadow-none disabled:hover:bg-[#EEEEEE]"
          >
            Order now
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          aria-label="Save"
          className="flex items-center justify-center rounded-full border border-black bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-zinc-100 active:scale-95 disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Saving</span>
            </span>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </header>
  );
}
