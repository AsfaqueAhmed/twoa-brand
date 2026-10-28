import { X } from 'lucide-react';

type Props = { message: string; onDismiss?: () => void; onRetry?: () => void };

export default function ErrorBanner({ message, onDismiss, onRetry }: Props) {
  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
      <span>{message}</span>
      <span className="flex shrink-0 items-center gap-3">
        {onRetry && (
          <button type="button" onClick={onRetry} className="font-bold underline">Retry</button>
        )}
        {onDismiss && (
          <button type="button" aria-label="Dismiss error" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </button>
        )}
      </span>
    </div>
  );
}
