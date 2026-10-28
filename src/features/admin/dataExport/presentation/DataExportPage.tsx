'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, ShieldAlert } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import Spinner from '@/shared/ui/Spinner';
import ErrorBanner from '@/features/admin/presentation/ui/ErrorBanner';
import { TABLE_ROW, TableCard, TableScroll, Th } from '@/features/admin/presentation/ui/TableCard';
import {
  EXPORT_TABLES,
  PRODUCT_CSV_COLUMNS,
  buildExportFile,
  localDateStamp,
  toCsv,
} from '../domain/exportFormat';
import { fetchAllRows, fetchTableCounts } from '../infrastructure/exportRepository';

interface Summary { filename: string; fetched: Record<string, number>; mismatched: string[] }

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function DataExportPage() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const loadCounts = useCallback(async () => {
    setLoadError(null);
    try {
      setCounts(await fetchTableCounts());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load table counts.');
    }
  }, []);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  const exportJson = async () => {
    setExporting(true);
    setExportError(null);
    setSummary(null);
    try {
      const tables: Record<string, unknown[]> = {};
      for (let i = 0; i < EXPORT_TABLES.length; i++) {
        const table = EXPORT_TABLES[i];
        setProgress(`Exporting ${table}… (${i + 1}/${EXPORT_TABLES.length})`);
        tables[table] = await fetchAllRows(table);
      }
      setProgress('Verifying row counts…');
      const expected = await fetchTableCounts();
      setCounts(expected);
      const { filename, json } = buildExportFile(tables, new Date());
      triggerDownload(json, filename, 'application/json');
      const fetched: Record<string, number> = {};
      for (const t of EXPORT_TABLES) fetched[t] = tables[t].length;
      setSummary({ filename, fetched, mismatched: EXPORT_TABLES.filter((t) => fetched[t] !== expected[t]) });
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setProgress(null);
      setExporting(false);
    }
  };

  const exportProductsCsv = async () => {
    setExporting(true);
    setExportError(null);
    setSummary(null);
    try {
      setProgress('Exporting products…');
      const rows = (await fetchAllRows('products')) as Record<string, unknown>[];
      const csv = '\uFEFF' + toCsv(rows, PRODUCT_CSV_COLUMNS);
      triggerDownload(csv, `twoa-products-${localDateStamp(new Date())}.csv`, 'text/csv;charset=utf-8');
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setProgress(null);
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Data Export" subtitle="Download a full copy of your store data." />

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          Export files contain customer names, phone numbers and addresses. Keep them private — they are not committed
          anywhere and should not be shared or uploaded to public places.
        </p>
      </div>

      {loadError && <ErrorBanner message={loadError} onRetry={() => void loadCounts()} />}

      {!counts && !loadError ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : counts && (
        <TableCard>
          <TableScroll
            minWidth="min-w-[420px]"
            head={<><Th className="pl-5">Table</Th><Th className="pr-5 text-right">Rows</Th></>}
          >
            {EXPORT_TABLES.map((t) => (
              <tr key={t} className={TABLE_ROW}>
                <td className="py-3 pl-5 pr-3 font-medium text-black">{t}</td>
                <td className="px-3 pr-5 text-right tabular-nums">{counts[t]}</td>
              </tr>
            ))}
          </TableScroll>
        </TableCard>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void exportJson()}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Download everything (JSON)
        </button>
        <button
          type="button"
          onClick={() => void exportProductsCsv()}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg border border-[#DDDDDD] bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#FAF9F6] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Download products (CSV)
        </button>
        {progress && (
          <span role="status" className="flex items-center gap-2 text-sm text-[#555555]">
            <Spinner /> {progress}
          </span>
        )}
      </div>

      {exportError && <ErrorBanner message={exportError} onDismiss={() => setExportError(null)} />}

      {summary && summary.mismatched.length > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Row counts do not match for: {summary.mismatched.map((t) => `${t} (downloaded ${summary.fetched[t]}, expected ${counts?.[t]})`).join(', ')}.
            Do not clear any data. Export again and re-check.
          </p>
        </div>
      )}

      {summary && (
        <div className="rounded-xl border border-[#EEEEEE] bg-white p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-black">
            <CheckCircle2 className={`h-5 w-5 ${summary.mismatched.length ? 'text-red-600' : 'text-green-600'}`} />
            Downloaded {summary.filename}
          </p>
          <ul className="mt-3 grid gap-1 text-sm text-[#555555] sm:grid-cols-2">
            {EXPORT_TABLES.map((t) => (
              <li key={t} className="flex justify-between gap-4">
                <span>{t}</span><span className="tabular-nums">{summary.fetched[t]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-[#717171]">
            Open the file and verify it looks complete before clearing any data.
          </p>
        </div>
      )}
    </div>
  );
}
