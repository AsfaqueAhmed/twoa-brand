'use client';

import { useState, useEffect, useCallback } from 'react';
import { Copy, CheckCircle2, RefreshCw } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import ErrorBanner from '@/features/admin/presentation/ui/ErrorBanner';
import StatusPill from '@/features/admin/presentation/ui/StatusPill';
import { TABLE_ROW, TableCard, TableScroll, Th } from '@/features/admin/presentation/ui/TableCard';

const FEED_URL = 'https://twoa-brand.web.app/product-feed.csv';

interface FeedRow {
  id: string;
  title: string;
  availability: string;
  image_link: string;
}

function parseCsv(text: string): FeedRow[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    // Simple splitter good enough for this feed's own escaping (fields containing
    // commas/quotes are wrapped in "..."), just for the admin preview table.
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ''));
    return row as unknown as FeedRow;
  });
}

export default function ProductFeedManager() {
  const [rows, setRows] = useState<FeedRow[] | null>(null);
  const [lastModified, setLastModified] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    setDismissed(false);
    try {
      const res = await fetch(`${FEED_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Feed file not found yet (HTTP ${res.status}) — deploy the site at least once.`);
      setLastModified(res.headers.get('last-modified'));
      setRows(parseCsv(await res.text()));
    } catch (err: any) {
      setError(err.message || 'Failed to load the product feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(FEED_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminPageHeader
        title="Product Feed"
        subtitle="Review and refresh your product feed."
        actions={
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1A1A1A] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {error && !dismissed && <ErrorBanner message={error} onDismiss={() => setDismissed(true)} />}

      <div className="rounded-xl border border-[#EEEEEE] bg-[#FAF9F6] p-5">
        <p className="text-xs text-[#717171]">
          Give this URL to Meta Commerce Manager as a scheduled feed fetch. It&apos;s regenerated automatically every
          time you build &amp; deploy the site (via <code className="font-mono">npm run build</code>) — base64
          uploaded images are rehosted to a real URL automatically, no manual step needed.
        </p>

        <div className="mt-4 flex flex-col gap-3 text-xs sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="inline-flex max-w-full items-center gap-1.5 truncate rounded-lg border border-[#EEEEEE] bg-white px-3 py-2 font-mono text-black hover:border-black"
            title={FEED_URL}
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate">{copied ? 'Copied!' : FEED_URL}</span>
          </button>
          {lastModified && (
            <span className="font-medium text-[#717171]">Last deployed {new Date(lastModified).toLocaleString()}</span>
          )}
        </div>

        {!loading && rows && <p className="mt-3 text-xs text-[#717171]"><strong className="text-black">{rows.length}</strong> products in the current feed.</p>}
      </div>

      <TableCard>
        <TableScroll
          minWidth="min-w-[480px]"
          head={<><Th className="pl-5">Product</Th><Th className="pr-5">Availability</Th></>}
        >
          {loading ? (
            <tr><td colSpan={2} className="py-12 text-center text-sm text-[#717171]">Loading feed...</td></tr>
          ) : !rows || rows.length === 0 ? (
            <tr><td colSpan={2} className="py-12 text-center text-sm text-[#717171]">No products in the feed yet.</td></tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className={TABLE_ROW}>
                <td className="py-3 pl-5 pr-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={row.image_link}
                      alt={row.title}
                      className="h-10 w-10 rounded-lg border border-[#EEEEEE] bg-[#F5F5F5] object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    <span className="max-w-[260px] truncate font-medium text-black">{row.title}</span>
                  </div>
                </td>
                <td className="px-3 pr-5">
                  <StatusPill tone={row.availability === 'in stock' ? 'green' : 'red'}>{row.availability}</StatusPill>
                </td>
              </tr>
            ))
          )}
        </TableScroll>
      </TableCard>
    </div>
  );
}
