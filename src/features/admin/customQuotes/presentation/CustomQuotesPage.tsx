'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Shirt } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import EmptyState from '@/shared/ui/EmptyState';
import Spinner from '@/shared/ui/Spinner';
import ErrorBanner from '@/features/admin/presentation/ui/ErrorBanner';
import type { CustomQuote, QuoteStatus } from '../domain/customQuote';
import { listQuotes, previewUrl, setQuotePricing, updateQuote, validSizesForParent } from '../infrastructure/customQuotesAdminRepository';
import { downloadQuoteZip } from '../application/buildQuoteZip';
import QuoteList from './QuoteList';
import QuoteDetail from './QuoteDetail';

function Content() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get('id');

  const [quotes, setQuotes] = useState<CustomQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sizes, setSizes] = useState<string[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      setQuotes(await listQuotes());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load quotes.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const selected = useMemo(() => quotes.find((q) => q.id === selectedId) ?? null, [quotes, selectedId]);
  const parentId = selected?.parentProductId;
  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    validSizesForParent(parentId).then((s) => { if (!cancelled) setSizes(s); }).catch(() => { if (!cancelled) setSizes([]); });
    return () => { cancelled = true; };
  }, [parentId]);

  const select = (id: string | null) => router.replace(id ? `${pathname}?id=${encodeURIComponent(id)}` : pathname, { scroll: false });

  const patch = async (id: string, p: { status?: QuoteStatus; adminNote?: string }) => {
    await updateQuote(id, p);
    await load();
  };

  const firstLoad = loading && quotes.length === 0;
  if (firstLoad) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <>
      {error && <div className="mb-4"><ErrorBanner message={error} onRetry={load} /></div>}
      {quotes.length === 0 ? (
        !error && <EmptyState icon={Shirt} title="No custom quotes yet" description="Quote requests from the tee studio will appear here." />
      ) : (
        <div className={`grid items-start gap-6 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_460px]' : ''}`}>
          <QuoteList quotes={quotes} selectedId={selected?.id ?? null} onSelect={select} previewSrc={previewUrl} />
          {selected && (
            <QuoteDetail
              key={selected.id}
              quote={selected}
              sizes={sizes}
              origin={typeof window !== 'undefined' ? window.location.origin : ''}
              previewSrc={previewUrl}
              onClose={() => select(null)}
              onSaveNote={(adminNote) => patch(selected.id, { adminNote })}
              onSetStatus={(status) => patch(selected.id, { status })}
              onPrice={async (lines, price, exp, regenerate) => {
                await setQuotePricing(selected.id, lines, price, exp, regenerate);
                await load();
              }}
              onDownloadZip={() => downloadQuoteZip(selected)}
            />
          )}
        </div>
      )}
      {selectedId && !selected && !loading && quotes.length > 0 && (
        <p className="mt-4 text-sm text-[#717171]">Quote {selectedId} was not found.</p>
      )}
    </>
  );
}

export default function CustomQuotesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Custom Quotes" subtitle="Review custom tee requests, price them and send a checkout link." />
      <Suspense fallback={<div className="flex justify-center py-24"><Spinner /></div>}>
        <Content />
      </Suspense>
    </div>
  );
}
