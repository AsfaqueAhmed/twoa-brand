import { X } from 'lucide-react';

export default function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
      <span>{message}</span>
      <button type="button" aria-label="Dismiss error" onClick={onDismiss}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
