'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ParentProduct } from '@/shared/domain/types';
import {
  fetchParentProducts,
  saveParentProduct,
  deleteParentProduct,
} from '../infrastructure/firestoreParentProductsAdminRepository';

interface SizeRow {
  size: string;
  stock: number;
}

interface FormState {
  id: string;
  name: string;
  rows: SizeRow[];
}

const emptyForm: FormState = { id: '', name: '', rows: [] };

export default function ParentProductManager() {
  const [parentProducts, setParentProducts] = useState<ParentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingExistingId, setIsEditingExistingId] = useState<string | null>(null);
  const [previousSizeOrder, setPreviousSizeOrder] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setParentProducts(await fetchParentProducts());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openCreate = () => {
    setForm({ id: `parent-${Date.now()}`, name: '', rows: [{ size: '', stock: 0 }] });
    setIsEditingExistingId(null);
    setPreviousSizeOrder([]);
    setError('');
    setIsEditing(true);
  };

  const openEdit = (pp: ParentProduct) => {
    setForm({
      id: pp.id,
      name: pp.name,
      rows: pp.sizeOrder.map((size) => ({ size, stock: pp.stockBySize[size] ?? 0 })),
    });
    setIsEditingExistingId(pp.id);
    setPreviousSizeOrder([...pp.sizeOrder]);
    setError('');
    setIsEditing(true);
  };

  const handleAddRow = () => {
    setForm((prev) => ({ ...prev, rows: [...prev.rows, { size: '', stock: 0 }] }));
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

  const handleRowStockChange = (rowIdx: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      rows: prev.rows.map((r, i) => (i === rowIdx ? { ...r, stock: parseInt(value) || 0 } : r)),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Please provide a name.');
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
    if (form.rows.some((r) => r.stock < 0)) {
      setError('Stock cannot be negative.');
      return;
    }
    const labels = form.rows.map((r) => r.size.trim());
    if (new Set(labels).size !== labels.length) {
      setError('Size labels must be unique.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const sizeOrder = labels;
      const stockBySize = Object.fromEntries(form.rows.map((r) => [r.size.trim(), r.stock]));
      await saveParentProduct({ id: form.id, name: form.name.trim(), sizeOrder, stockBySize }, previousSizeOrder);
      await refresh();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save parent product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (pp: ParentProduct) => {
    if (!window.confirm(`Delete parent product "${pp.name}"? This cannot be undone.`)) return;
    try {
      await deleteParentProduct(pp.id, pp.sizeOrder);
      await refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete parent product.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between bg-[#FAF9F6] border border-[#EEEEEE] p-5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-black">Parent Products</h2>
          <p className="text-[10px] text-[#717171] mt-1">
            Own the canonical size list and per-size stock. Link a catalog product to one from the Inventory tab.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center space-x-2 rounded-none bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#333333] transition-colors"
          id="admin-add-parentproduct-btn"
        >
          <Plus className="h-4 w-4" />
          <span>Add Parent Product</span>
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
              className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-none border border-[#EEEEEE] bg-[#FDFDFD] shadow-2xl p-6 sm:p-8"
            >
              <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-4 mb-6">
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-black">
                  {isEditingExistingId ? 'Edit Parent Product' : 'Add Parent Product'}
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
                    Name*
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Classic Linen Overshirt — Stock Pool"
                    className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>

                {/* Size + stock rows */}
                <div className="border-t border-[#EEEEEE] pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#717171]">
                      Sizes & Stock*
                    </span>
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="bg-black hover:bg-[#333333] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2 transition-colors"
                    >
                      Add Row
                    </button>
                  </div>

                  {form.rows.length === 0 ? (
                    <p className="text-[10px] italic text-[#919191]">No sizes yet.</p>
                  ) : (
                    <div className="overflow-x-auto border border-[#EEEEEE]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#FAF9F6] border-b border-[#EEEEEE] text-[9px] font-bold uppercase tracking-wider text-[#717171]">
                            <th className="py-2 px-3 text-left">Size</th>
                            <th className="py-2 px-3 text-left">Stock</th>
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
                                  className="w-24 rounded-none border border-[#EEEEEE] bg-white py-1.5 px-2 text-[11px] font-mono font-bold text-black focus:border-black focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="number"
                                  value={row.stock}
                                  onChange={(e) => handleRowStockChange(rowIdx, e.target.value)}
                                  placeholder="0"
                                  className="w-24 rounded-none border border-[#EEEEEE] bg-white py-1.5 px-2 text-[11px] font-mono text-black focus:border-black focus:outline-none"
                                />
                              </td>
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
                    {isSaving ? 'Saving...' : 'Save Parent Product'}
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
              <th className="py-4 px-6">Sizes</th>
              <th className="py-4 px-6">Total Stock</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE] text-xs text-[#1A1A1A]">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-[#717171] font-semibold">
                  Loading parent products...
                </td>
              </tr>
            ) : parentProducts.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-[#717171] font-semibold">
                  No parent products yet. Add one to get started.
                </td>
              </tr>
            ) : (
              parentProducts.map((pp) => {
                const totalStock = Object.values(pp.stockBySize).reduce((a, b) => a + b, 0);
                return (
                  <tr key={pp.id} className="hover:bg-[#FAF9F6]/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-black uppercase tracking-wide">{pp.name}</td>
                    <td className="py-4 px-6 text-[10px] text-[#717171] font-mono">
                      {pp.sizeOrder.map((s) => `${s}:${pp.stockBySize[s] ?? 0}`).join('  ')}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold">{totalStock} units</td>
                    <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => openEdit(pp)}
                        className="inline-flex items-center space-x-1 border border-[#EEEEEE] bg-white hover:border-black p-2 text-black transition-colors"
                        title="Edit Parent Product"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pp)}
                        className="inline-flex items-center space-x-1 border border-red-200 bg-white hover:bg-red-50 p-2 text-red-600 transition-colors"
                        title="Delete Parent Product"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
