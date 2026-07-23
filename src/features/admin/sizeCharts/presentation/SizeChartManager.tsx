'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { SizeChart } from '@/shared/domain/types';
import { fetchSizeCharts, saveSizeChart, deleteSizeChart } from '../infrastructure/firestoreSizeChartsRepository';

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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCharts(await fetchSizeCharts());
    } finally {
      setLoading(false);
    }
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
    if (!window.confirm(`Delete size chart "${chart.name}"? This cannot be undone.`)) return;
    await deleteSizeChart(chart.id);
    await refresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between bg-[#FAF9F6] border border-[#EEEEEE] p-5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-black">Size Charts</h2>
          <p className="text-[10px] text-[#717171] mt-1">
            Reusable measurement templates. Assign one to a product from the Inventory tab.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center space-x-2 rounded-none bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#333333] transition-colors"
          id="admin-add-sizechart-btn"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Chart</span>
        </button>
      </div>

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
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-none border border-[#EEEEEE] bg-[#FDFDFD] shadow-2xl p-6 sm:p-8"
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
                    className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
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
                      className="flex-1 rounded-none border border-[#EEEEEE] bg-white py-1.5 px-2.5 text-[11px] font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none"
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
                                  className="w-16 rounded-none border border-[#EEEEEE] bg-white py-1.5 px-2 text-[11px] font-mono font-bold text-black focus:border-black focus:outline-none"
                                />
                              </td>
                              {row.values.map((val, colIdx) => (
                                <td key={colIdx} className="py-1.5 px-2">
                                  <input
                                    type="text"
                                    value={val}
                                    onChange={(e) => handleRowValueChange(rowIdx, colIdx, e.target.value)}
                                    placeholder={`e.g. 36" - 38"`}
                                    className="w-24 rounded-none border border-[#EEEEEE] bg-white py-1.5 px-2 text-[11px] font-mono text-black focus:border-black focus:outline-none"
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

      <div className="overflow-x-auto border border-[#EEEEEE] bg-white rounded-none shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF9F6] border-b border-[#EEEEEE] text-[10px] font-bold uppercase tracking-wider text-[#717171]">
              <th className="py-4 px-6">Name</th>
              <th className="py-4 px-6">Columns</th>
              <th className="py-4 px-6">Rows</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE] text-xs text-[#1A1A1A]">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-[#717171] font-semibold">
                  Loading size charts...
                </td>
              </tr>
            ) : charts.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-[#717171] font-semibold">
                  No size charts yet. Add one to get started.
                </td>
              </tr>
            ) : (
              charts.map((c) => (
                <tr key={c.id} className="hover:bg-[#FAF9F6]/50 transition-colors">
                  <td className="py-4 px-6 font-bold text-black uppercase tracking-wide">{c.name}</td>
                  <td className="py-4 px-6 text-[10px] text-[#717171]">{c.columns.join(', ')}</td>
                  <td className="py-4 px-6 font-mono">{c.rows.length}</td>
                  <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => openEdit(c)}
                      className="inline-flex items-center space-x-1 border border-[#EEEEEE] bg-white hover:border-black p-2 text-black transition-colors"
                      title="Edit Size Chart"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="inline-flex items-center space-x-1 border border-red-200 bg-white hover:bg-red-50 p-2 text-red-600 transition-colors"
                      title="Delete Size Chart"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
