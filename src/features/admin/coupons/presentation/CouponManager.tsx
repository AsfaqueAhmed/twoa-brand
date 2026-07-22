'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Coupon, DiscountType } from '@/features/coupons/domain/coupon';
import { divisions, districts } from '@/features/checkout/infrastructure/bangladeshAreas';
import {
  listAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  type CouponFormPayload,
} from '../infrastructure/firestoreCouponAdminRepository';

const DISCOUNT_TYPES: { value: DiscountType; label: string }[] = [
  { value: 'percentage', label: 'Percentage off' },
  { value: 'flat', label: 'Flat amount off' },
  { value: 'free_shipping', label: 'Free shipping' },
];

const emptyForm: CouponFormPayload = {
  code: '',
  discountType: 'percentage',
  value: 10,
  minOrderSubtotal: undefined,
  districtRestriction: undefined,
  expiresAt: undefined,
  usageLimit: undefined,
  isActive: true,
};

export default function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingExistingCode, setIsEditingExistingCode] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormPayload>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCoupons(await listAllCoupons());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openCreate = () => {
    setForm(emptyForm);
    setIsEditingExistingCode(null);
    setError('');
    setIsEditing(true);
  };

  const openEdit = (coupon: Coupon) => {
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      value: coupon.value,
      minOrderSubtotal: coupon.minOrderSubtotal,
      districtRestriction: coupon.districtRestriction,
      expiresAt: coupon.expiresAt,
      usageLimit: coupon.usageLimit,
      isActive: coupon.isActive,
    });
    setIsEditingExistingCode(coupon.code);
    setError('');
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      setError('Please provide a coupon code.');
      return;
    }
    if (form.discountType === 'percentage' && (form.value <= 0 || form.value > 100)) {
      setError('Percentage discounts must be between 1 and 100.');
      return;
    }
    if (form.discountType === 'flat' && form.value <= 0) {
      setError('Flat discount amount must be greater than 0.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      if (isEditingExistingCode) {
        await updateCoupon(isEditingExistingCode, form);
      } else {
        await createCoupon(form);
      }
      await refresh();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save coupon.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!window.confirm(`Delete coupon ${code}? This cannot be undone.`)) return;
    await deleteCoupon(code);
    await refresh();
  };

  const handleToggleActive = async (coupon: Coupon) => {
    await updateCoupon(coupon.code, { isActive: !coupon.isActive });
    await refresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between bg-[#FAF9F6] border border-[#EEEEEE] p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-black">Coupons</h2>
        <button
          onClick={openCreate}
          className="flex items-center justify-center space-x-2 rounded-none bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#333333] transition-colors"
          id="admin-add-coupon-btn"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Coupon</span>
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
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-none border border-[#EEEEEE] bg-[#FDFDFD] shadow-2xl p-6 sm:p-8"
            >
              <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-4 mb-6">
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-black">
                  {isEditingExistingCode ? 'Edit Coupon' : 'Add New Coupon'}
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

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">Code*</label>
                  <input
                    type="text"
                    required
                    disabled={!!isEditingExistingCode}
                    value={form.code}
                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SUMMER20"
                    className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none disabled:bg-[#F5F5F5] disabled:text-[#919191] font-mono uppercase"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">Discount Type*</label>
                    <select
                      value={form.discountType}
                      onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as DiscountType }))}
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                    >
                      {DISCOUNT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.discountType !== 'free_shipping' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                        Value{form.discountType === 'percentage' ? ' (%)' : ' ($)'}*
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.value}
                        onChange={(e) => setForm((prev) => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                        className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                      Minimum Order Subtotal ($, optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.minOrderSubtotal ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, minOrderSubtotal: e.target.value ? parseFloat(e.target.value) : undefined }))
                      }
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                      Usage Limit (optional)
                    </label>
                    <input
                      type="number"
                      value={form.usageLimit ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, usageLimit: e.target.value ? parseInt(e.target.value, 10) : undefined }))
                      }
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                      District Restriction (optional)
                    </label>
                    <select
                      value={form.districtRestriction ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, districtRestriction: e.target.value || undefined }))}
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                    >
                      <option value="">No restriction</option>
                      {divisions.map((div) => (
                        <optgroup key={div.id} label={div.name}>
                          {districts
                            .filter((d) => d.divisionId === div.id)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                      Expires At (optional)
                    </label>
                    <input
                      type="date"
                      value={form.expiresAt ? form.expiresAt.slice(0, 10) : ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined }))
                      }
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  />
                  <span>Active</span>
                </label>

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
                    {isSaving ? 'Saving...' : 'Save Coupon'}
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
              <th className="py-4 px-6">Code</th>
              <th className="py-4 px-6">Discount</th>
              <th className="py-4 px-6">Conditions</th>
              <th className="py-4 px-6">Usage</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE] text-xs text-[#1A1A1A]">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#717171] font-semibold">
                  Loading coupons...
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#717171] font-semibold">
                  No coupons yet. Add one to get started.
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.code} className="hover:bg-[#FAF9F6]/50 transition-colors">
                  <td className="py-4 px-6 font-mono font-bold">{c.code}</td>
                  <td className="py-4 px-6">
                    {c.discountType === 'percentage'
                      ? `${c.value}% off`
                      : c.discountType === 'flat'
                        ? `$${c.value.toFixed(2)} off`
                        : 'Free shipping'}
                  </td>
                  <td className="py-4 px-6 text-[10px] text-[#717171]">
                    {c.minOrderSubtotal ? `Min $${c.minOrderSubtotal.toFixed(2)}. ` : ''}
                    {c.districtRestriction
                      ? `District: ${districts.find((d) => d.id === c.districtRestriction)?.name || c.districtRestriction}. `
                      : ''}
                    {c.expiresAt ? `Expires ${new Date(c.expiresAt).toLocaleDateString()}.` : ''}
                  </td>
                  <td className="py-4 px-6 font-mono">
                    {c.usageCount}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => handleToggleActive(c)}
                      className={`px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider ${
                        c.isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-[#F5F5F5] text-[#717171] border-[#EEEEEE]'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => openEdit(c)}
                      className="inline-flex items-center space-x-1 border border-[#EEEEEE] bg-white hover:border-black p-2 text-black transition-colors"
                      title="Edit Coupon"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.code)}
                      className="inline-flex items-center space-x-1 border border-red-200 bg-white hover:bg-red-50 p-2 text-red-600 transition-colors"
                      title="Delete Coupon"
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
