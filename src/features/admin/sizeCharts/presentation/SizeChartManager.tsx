'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, XCircle, Ruler, Rows3, PackageCheck, PackageX, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { SizeChart } from '@/shared/domain/types';
import { fetchSizeCharts, saveSizeChart, deleteSizeChart } from '../infrastructure/firestoreSizeChartsRepository';
import { fetchAllProductsForAdmin } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import { paginate } from '@/features/admin/inventory/domain/productList';
import StatCard from '@/features/admin/presentation/ui/StatCard';
import StatsRow from '@/features/admin/presentation/ui/StatsRow';
import FilterBar from '@/features/admin/presentation/ui/FilterBar';
import { FilterSearch, FilterSelect } from '@/features/admin/presentation/ui/FilterControls';
import ErrorBanner from '@/features/admin/presentation/ui/ErrorBanner';
import Pagination from '@/features/admin/presentation/ui/Pagination';
import { TABLE_ROW, TableCard, TableScroll, Th } from '@/features/admin/presentation/ui/TableCard';
import EmptyState from '@/shared/ui/EmptyState';
import {
  DEFAULT_SIZE_CHART_FILTERS,
  activeSizeChartFilterCount,
  columnChips,
  filterSizeCharts,
  linkedProductCounts,
  sizeChartStats,
  type SizeChartFilters,
  type SizeChartUsageFilter,
} from '../domain/sizeChartList';

const PAGE_SIZE = 20;

const emptyForm: SizeChart = { id: '', name: '', columns: [], rows: [] };

export default function SizeChartManager() {
  const [charts, setCharts] = useState<SizeChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingExistingId, setIsEditingExistingId] = useState<string | null>(null);
  const [form, setForm] = useState<SizeChart>(emptyForm);
  const [newColumnInput, setNewColumnInput] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [listError, setListError] = useState('');
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [usageNotice, setUsageNotice] = useState('');
  const [filters, setFilters] = useState<SizeChartFilters>(DEFAULT_SIZE_CHART_FILTERS);
  const [page, setPage] = useState(1);

  const refresh = useCallback(async () => {
    // Charts and product usage load independently: a usage failure never hides the charts.
    const [chartsResult, productsResult] = await Promise.allSettled([fetchSizeCharts(), fetchAllProductsForAdmin()]);
    if (chartsResult.status === 'fulfilled') {
      setCharts(chartsResult.value);
      setListError('');
    } else {
      setListError(chartsResult.reason?.message || 'Failed to load size charts.');
    }
    if (productsResult.status === 'fulfilled') {
      setCounts(linkedProductCounts(productsResult.value));
      setUsageNotice('');
    } else {
      setCounts(null);
      setUsageNotice('Could not load products, so chart usage is unavailable right now.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openCreate = () => {
    setForm({ id: `chart-${Date.now()}`, name: '', columns: [], rows: [] });
    setIsEditingExistingId(null);
    setNewColumnInput('');
    setError('');
    setIsEditing(true);
  };

  const openEdit = (chart: SizeChart) => {
    setForm({ ...chart, columns: [...chart.columns], rows: chart.rows.map((r) => ({ ...r, values: [...r.values] })) });
    setIsEditingExistingId(chart.id);
    setNewColumnInput('');
    setError('');
    setIsEditing(true);
  };

  const handleAddColumn = () => {
    const trimmed = newColumnInput.trim();
    if (!trimmed || form.columns.includes(trimmed)) return;
    setForm((prev) => ({
      ...prev,
      columns: [...prev.columns, trimmed],
      rows: prev.rows.map((r) => ({ ...r, values: [...r.values, ''] })),
    }));
    setNewColumnInput('');
  };

  const handleRemoveColumn = (colIdx: number) => {
    setForm((prev) => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== colIdx),
      rows: prev.rows.map((r) => ({ ...r, values: r.values.filter((_, i) => i !== colIdx) })),
    }));
  };

  const handleAddRow = () => {
    setForm((prev) => ({ ...prev, rows: [...prev.rows, { size: '', values: prev.columns.map(() => '') }] }));
  };

  const handleRemoveRow = (rowIdx: number) => {
    setForm((prev) => ({ ...prev, rows: prev.rows.filter((_, i) => i !== rowIdx) }));
  };

  const handleRowSizeChange = (rowIdx: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      rows: prev.rows.map((r, i) => (i === rowIdx ? { ...r, size: value } : r)),
    }));
  };

  const handleRowValueChange = (rowIdx: number, colIdx: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      rows: prev.rows.map((r, i) =>
        i === rowIdx ? { ...r, values: r.values.map((v, ci) => (ci === colIdx ? value : v)) } : r
      ),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Please provide a chart name.');
      return;
    }
    if (form.columns.length === 0) {
      setError('Add at least one measurement column (e.g. Chest, Length).');
      return;
    }
    if (form.rows.length === 0) {
      setError('Add at least one size row.');
      return;
    }
    if (form.rows.some((r) => !r.size.trim())) {
      setError('Every row needs a size label.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await saveSizeChart(form);
      await refresh();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save size chart.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (chart: SizeChart) => {
    // Server-side style guard: re-check usage with fresh product data before deleting.
    let current = counts;
    try {
      current = linkedProductCounts(await fetchAllProductsForAdmin());
      setCounts(current);
    } catch {
      // fall back to the last known counts
    }
    if (current && current[chart.id] > 0) {
      setListError(`"${chart.name}" is used by ${current[chart.id]} product(s). Unassign it from those products first.`);
      return;
    }
    if (!window.confirm(`Delete size chart "${chart.name}"? This cannot be undone.`)) return;
    try {
      await deleteSizeChart(chart.id);
      await refresh();
    } catch (err: any) {
      setListError(err?.message || 'Failed to delete size chart.');
    }
  };

  const stats = sizeChartStats(charts, counts);
  const activeCount = activeSizeChartFilterCount(filters);
  const visible = filterSizeCharts(charts, filters, counts);
  const pageData = paginate(visible, page, PAGE_SIZE);
  const updateFilters = (f: SizeChartFilters) => {
    setFilters(f);
    setPage(1);
  };
  const dash = (n: number | null) => (n === null ? '—' : n);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminPageHeader
        title="Size Charts"
        subtitle="Reusable size chart templates for your products."
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333333]"
            id="admin-add-sizechart-btn"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Chart</span>
          </button>
        }
      />

      <StatsRow>
        <StatCard icon={<Ruler className="h-5 w-5" />} label="Total charts" value={stats.total} />
        <StatCard icon={<Rows3 className="h-5 w-5" />} label="Total size rows" value={stats.sizeRows} />
        <StatCard icon={<PackageCheck className="h-5 w-5" />} label="Charts in use" value={dash(stats.inUse)} tone="green" caption="linked to products" />
        <StatCard icon={<PackageX className="h-5 w-5" />} label="Unused charts" value={dash(stats.unused)} tone="gray" />
      </StatsRow>

      {usageNotice && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
          {usageNotice}
        </div>
      )}

      <FilterBar activeCount={activeCount} onReset={() => updateFilters(DEFAULT_SIZE_CHART_FILTERS)}>
        <FilterSearch
          id="admin-sizechart-search"
          value={filters.search}
          onChange={(search) => updateFilters({ ...filters, search })}
          placeholder="Search by chart name..."
        />
        <FilterSelect
          aria-label="Usage"
          value={filters.usage}
          disabled={counts === null}
          onChange={(e) => updateFilters({ ...filters, usage: e.target.value as SizeChartUsageFilter })}
        >
          <option value="">Usage: All</option>
          <option value="used">In use</option>
          <option value="unused">Unused</option>
        </FilterSelect>
      </FilterBar>

      {listError && <ErrorBanner message={listError} onDismiss={() => setListError('')} />}

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 15 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-[#EEEEEE] bg-[#FDFDFD] shadow-2xl p-6 sm:p-8"
            >
              <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-4 mb-6">
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-black">
                  {isEditingExistingId ? 'Edit Size Chart' : 'Add New Size Chart'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-[#717171] hover:text-black border border-[#EEEEEE] p-1.5"
                >
                  <XCircle className="h-4.5 w-4.5" />
                </button>
              </div>

              {error && <div className="bg-red-50 text-red-800 border border-red-200 text-xs p-4 mb-6 font-medium">{error}</div>}

              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                    Chart Name*
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Men's T-Shirt"
                    className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>

                {/* Measurement columns */}
                <div className="border-t border-[#EEEEEE] pt-5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-3">
                    Measurement Columns* (e.g. Chest, Length, Shoulder)
                  </span>

                  {form.columns.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 mb-3">
                      {form.columns.map((col, i) => (
                        <div
                          key={col}
                          className="flex items-center gap-2 px-3 py-1.5 border border-[#EEEEEE] bg-[#F9F9F9] text-xs font-semibold text-black"
                        >
                          <span>{col}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveColumn(i)}
                            className="text-red-600 hover:text-red-800 font-bold ml-1 text-[10px]"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newColumnInput}
                      onChange={(e) => setNewColumnInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddColumn();
                        }
                      }}
                      placeholder="Add a column (e.g. Chest)"
                      className="flex-1 rounded-lg border border-[#EEEEEE] bg-white py-1.5 px-2.5 text-[11px] font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddColumn}
                      className="bg-black hover:bg-[#333333] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2 transition-colors shrink-0"
                    >
                      Add Column
                    </button>
                  </div>
                </div>

                {/* Size rows */}
                <div className="border-t border-[#EEEEEE] pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#717171]">
                      Size Rows*
                    </span>
                    <button
                      type="button"
                      onClick={handleAddRow}
                      disabled={form.columns.length === 0}
                      className="bg-black hover:bg-[#333333] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2 transition-colors disabled:bg-[#717171] disabled:cursor-not-allowed"
                    >
                      Add Row
                    </button>
                  </div>

                  {form.columns.length === 0 ? (
                    <p className="text-[10px] italic text-[#919191]">Add at least one column before adding rows.</p>
                  ) : form.rows.length === 0 ? (
                    <p className="text-[10px] italic text-[#919191]">No rows yet.</p>
                  ) : (
                    <div className="overflow-x-auto border border-[#EEEEEE]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#FAF9F6] border-b border-[#EEEEEE] text-[9px] font-bold uppercase tracking-wider text-[#717171]">
                            <th className="py-2 px-3 text-left">Size</th>
                            {form.columns.map((col) => (
                              <th key={col} className="py-2 px-3 text-left">
                                {col}
                              </th>
                            ))}
                            <th className="py-2 px-3 w-8" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                          {form.rows.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={row.size}
                                  onChange={(e) => handleRowSizeChange(rowIdx, e.target.value)}
                                  placeholder="S"
                                  className="w-16 rounded-lg border border-[#EEEEEE] bg-white py-1.5 px-2 text-[11px] font-mono font-bold text-black focus:border-black focus:outline-none"
                                />
                              </td>
                              {row.values.map((val, colIdx) => (
                                <td key={colIdx} className="py-1.5 px-2">
                                  <input
                                    type="text"
                                    value={val}
                                    onChange={(e) => handleRowValueChange(rowIdx, colIdx, e.target.value)}
                                    placeholder={`e.g. 36" - 38"`}
                                    className="w-24 rounded-lg border border-[#EEEEEE] bg-white py-1.5 px-2 text-[11px] font-mono text-black focus:border-black focus:outline-none"
                                  />
                                </td>
                              ))}
                              <td className="py-1.5 px-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(rowIdx)}
                                  className="text-red-600 hover:text-red-800 font-bold text-xs"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#EEEEEE] pt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="border border-[#EEEEEE] hover:border-black text-black text-xs font-bold uppercase tracking-widest px-6 py-3.5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-black hover:bg-[#333333] text-white text-xs font-bold uppercase tracking-widest px-8 py-3.5 transition-colors disabled:bg-[#717171]"
                  >
                    {isSaving ? 'Saving...' : 'Save Size Chart'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#EEEEEE] py-16">
          <RefreshCw className="h-5 w-5 animate-spin text-[#717171]" />
          <p className="mt-3 text-xs font-semibold text-[#717171]">Loading size charts...</p>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title={charts.length === 0 ? 'No size charts yet' : 'No size charts found'}
          description={charts.length === 0 ? 'Add one to get started.' : 'Try changing or resetting the filters.'}
        />
      ) : (
        <TableCard>
          <div className="flex items-center justify-end border-b border-[#EEEEEE] px-5 py-3">
            <Pagination
              from={pageData.from}
              to={pageData.to}
              total={pageData.total}
              page={pageData.page}
              totalPages={pageData.totalPages}
              onPage={setPage}
            />
          </div>
          <TableScroll
            minWidth="min-w-[860px]"
            head={
              <>
                <Th className="pl-5">Name</Th>
                <Th>Measurements</Th>
                <Th>Rows</Th>
                <Th>Linked products</Th>
                <Th className="pr-5 text-right">Actions</Th>
              </>
            }
          >
            {pageData.items.map((c) => {
              const chips = columnChips(c.columns);
              const linked = counts ? (counts[c.id] ?? 0) : null;
              const locked = linked !== null && linked > 0;
              return (
                <tr key={c.id} className={TABLE_ROW}>
                  <td className="py-3 pl-5 pr-3 font-semibold text-black">{c.name}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {chips.shown.map((col) => (
                        <span key={col} className="rounded-md border border-[#EEEEEE] bg-[#FAF9F6] px-2 py-0.5 text-xs text-[#555555]">
                          {col}
                        </span>
                      ))}
                      {chips.extra > 0 && <span className="text-xs font-medium text-[#717171]">+{chips.extra}</span>}
                      {c.columns.length === 0 && '—'}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono">{c.rows.length}</td>
                  <td className="px-3 py-3">{dash(linked)}</td>
                  <td className="px-3 py-3 pr-5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        title="Edit Size Chart"
                        aria-label={`Edit ${c.name}`}
                        className="rounded-lg border border-[#EEEEEE] bg-white p-2 text-black transition-colors hover:border-black"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        disabled={locked}
                        title={locked ? `Used by ${linked} product(s); unassign it first` : 'Delete Size Chart'}
                        aria-label={`Delete ${c.name}`}
                        className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </TableScroll>
        </TableCard>
      )}
    </div>
  );
}
