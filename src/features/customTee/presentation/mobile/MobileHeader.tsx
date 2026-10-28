'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';

type Props = {
  title?: string;
  subtitle?: string;
  onBack: () => void;
  onSave: () => void;
  saving?: boolean;
};

export default function MobileHeader({
  title = 'Design Studio',
  subtitle,
  onBack,
  onSave,
  saving = false,
}: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between border-b border-[#EEEEEE] bg-white px-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black hover:bg-gray-100 active:scale-95 transition-transform"
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

      <div className="shrink-0 pl-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          aria-label="Save"
          className="flex items-center justify-center rounded-full bg-black px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-zinc-800 active:scale-95 disabled:opacity-50"
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
