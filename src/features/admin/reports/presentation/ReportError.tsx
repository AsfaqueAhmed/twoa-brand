'use client';

import { useEffect, useState } from 'react';
import ErrorBanner from '@/features/admin/presentation/ui/ErrorBanner';

/** Without data the banner cannot be dismissed so Retry stays reachable. */
export default function ReportError({ error, onRetry, hasData = false }: { error: string | null | undefined; onRetry: () => void; hasData?: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [error]);
  if (!error || (hasData && dismissed)) return null;
  return <ErrorBanner message={error} onRetry={onRetry} onDismiss={hasData ? () => setDismissed(true) : undefined} />;
}
