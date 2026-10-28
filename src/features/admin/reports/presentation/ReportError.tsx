'use client';

import { useEffect, useState } from 'react';
import ErrorBanner from '@/features/admin/presentation/ui/ErrorBanner';

export default function ReportError({ error, onRetry }: { error: string | null | undefined; onRetry: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [error]);
  if (!error || dismissed) return null;
  return (
    <div className="space-y-2">
      <ErrorBanner message={error} onDismiss={() => setDismissed(true)} />
      <button type="button" onClick={onRetry} className="text-xs font-bold underline">Retry</button>
    </div>
  );
}
