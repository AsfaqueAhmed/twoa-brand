'use client';

import { useState, useEffect, useCallback } from 'react';
import { Copy, CheckCircle2, RefreshCw } from 'lucide-react';

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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
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
      <div className="bg-[#FAF9F6] border border-[#EEEEEE] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-black">Product Feed</h2>
            <p className="text-[10px] text-[#717171] mt-1">
              Give this URL to Meta Commerce Manager as a scheduled feed fetch. It's regenerated automatically every
              time you build &amp; deploy the site (via <code className="font-mono">npm run build</code>) — base64
              uploaded images are rehosted to a real URL automatically, no manual step needed.
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center justify-center space-x-2 rounded-none border border-[#EEEEEE] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-black hover:border-black transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 text-[10px]">
          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1.5 border border-[#EEEEEE] bg-white hover:border-black px-2.5 py-1.5 text-black font-mono truncate max-w-full"
            title={FEED_URL}
          >
            {copied ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <Copy className="h-3 w-3 shrink-0" />}
            <span className="truncate">{copied ? 'Copied!' : FEED_URL}</span>
          </button>
          {lastModified && (
            <span className="font-bold uppercase tracking-wider text-[#717171]">
              Last deployed {new Date(lastModified).toLocaleString()}
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-800 border border-red-200 text-xs p-4 mt-4 font-medium">{error}</div>
        )}

        {!loading && rows && <p className="text-[10px] text-[#717171] mt-3"><strong className="text-black">{rows.length}</strong> products in the current feed.</p>}
      </div>

      <div className="overflow-x-auto border border-[#EEEEEE] bg-white rounded-none shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF9F6] border-b border-[#EEEEEE] text-[10px] font-bold uppercase tracking-wider text-[#717171]">
              <th className="py-4 px-6">Product</th>
              <th className="py-4 px-6">Availability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE] text-xs text-[#1A1A1A]">
            {loading ? (
              <tr>
                <td colSpan={2} className="py-12 text-center text-[#717171] font-semibold">
                  Loading feed...
                </td>
              </tr>
            ) : !rows || rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-12 text-center text-[#717171] font-semibold">
                  No products in the feed yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#FAF9F6]/50 transition-colors">
                  <td className="py-4 px-6 flex items-center space-x-3">
                    <img
                      src={row.image_link}
                      alt={row.title}
                      className="h-9 w-9 object-cover bg-[#F5F5F5] border border-[#EEEEEE]"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    <span className="font-bold text-black uppercase tracking-wide truncate max-w-[220px]">
                      {row.title}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`font-mono font-bold px-2 py-0.5 border text-[10px] ${
                        row.availability === 'in stock'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      {row.availability}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
