'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, XCircle, Ticket, RefreshCw } from 'lucide-react';
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
import { paginate } from '@/features/admin/inventory/domain/productList';
import Pagination from '@/features/admin/presentation/ui/Pagination';
import ErrorBanner from '@/features/admin/presentation/ui/ErrorBanner';
import { TableCard } from '@/features/admin/presentation/ui/TableCard';
import EmptyState from '@/shared/ui/EmptyState';
import {
  DEFAULT_COUPON_FILTERS,
  activeCouponFilterCount,
  couponStats,
  filterCoupons,
  type CouponFilters,
} from '../domain/couponList';
import CouponStatsRow from './list/CouponStatsRow';
import CouponFilterBar from './list/CouponFilterBar';
import CouponsTable from './list/CouponsTable';

const PAGE_SIZE = 20;

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
  isPublic: true,
};

export default function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingExistingCode, setIsEditingExistingCode] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormPayload>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [listError, setListError] = useState('');
  const [filters, setFilters] = useState<CouponFilters>(DEFAULT_COUPON_FILTERS);
  const [page, setPage] = useState(1);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    // Only the first load shows the spinner; later reloads are silent.
    if (!hasLoadedRef.current) setLoading(true);
    try {
      setCoupons(await listAllCoupons());
      hasLoadedRef.current = true;
      setListError('');
    } catch (err: any) {
      console.error('Error fetching coupons: ', err);
      setListError(err?.message || 'Failed to load coupons.');
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
      isPublic: coupon.isPublic,
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

  const runListAction = async (action: () => Promise<unknown>, fallback: string) => {
    try {
      await action();
      await refresh();
    } catch (err: any) {
      setListError(err?.message || fallback);
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}? This cannot be undone.`)) return;
    await runListAction(() => deleteCoupon(coupon.code), 'Failed to delete coupon.');
  };

  const handleToggleActive = (coupon: Coupon) =>
    runListAction(() => updateCoupon(coupon.code, { isActive: !coupon.isActive }), 'Failed to update coupon.');

  const handleToggleVisibility = (coupon: Coupon) =>
    runListAction(() => updateCoupon(coupon.code, { isPublic: !coupon.isPublic }), 'Failed to update coupon.');

  const stats = useMemo(() => couponStats(coupons), [coupons]);
  const visible = useMemo(() => filterCoupons(coupons, filters), [coupons, filters]);
  const pageData = paginate(visible, page, PAGE_SIZE);
  const activeCount = activeCouponFilterCount(filters);
  const firstLoad = loading && coupons.length === 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Coupons</h1>
          <p className="mt-1 text-sm text-[#717171]">Create and manage discount codes.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333333]"
          id="admin-add-coupon-btn"
        >
          <Plus className="h-4 w-4" />
          <span>Create Coupon</span>
        </button>
      </div>

      <CouponStatsRow stats={stats} />

      {firstLoad && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#EEEEEE] py-16">
          <RefreshCw className="h-5 w-5 animate-spin text-[#717171]" />
          <p className="mt-3 text-xs font-semibold text-[#717171]">Loading coupons...</p>
        </div>
      )}

      <CouponFilterBar
        filters={filters}
        activeCount={activeCount}
        onFilters={(f) => {
          setFilters(f);
          setPage(1);
        }}
        onReset={() => {
          setFilters(DEFAULT_COUPON_FILTERS);
          setPage(1);
        }}
      />

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
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-[#EEEEEE] bg-[#FDFDFD] shadow-2xl p-6 sm:p-8"
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
                    className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none disabled:bg-[#F5F5F5] disabled:text-[#919191] font-mono uppercase"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">Discount Type*</label>
                    <select
                      value={form.discountType}
                      onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as DiscountType }))}
                      className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
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
                        className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
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
                      className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
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
                      className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
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
                      className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
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
                      className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black">
                    <input
                      type="checkbox"
                      checked={form.isPublic}
                      onChange={(e) => setForm((prev) => ({ ...prev, isPublic: e.target.checked }))}
                    />
                    <span>Public</span>
                  </label>
                </div>
                <p className="text-[10px] text-[#717171] -mt-2">
                  {form.isPublic
                    ? 'Shown in the "Active Promotions" list at checkout.'
                    : 'Private — hidden from checkout; only works if a customer enters the exact code.'}
                </p>

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

      {!firstLoad &&
        (visible.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title={coupons.length === 0 ? 'No coupons yet' : 'No coupons found'}
            description={coupons.length === 0 ? 'Create a coupon to get started.' : 'Try changing or resetting the filters.'}
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
            <CouponsTable
              coupons={pageData.items}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onToggleVisibility={handleToggleVisibility}
            />
          </TableCard>
        ))}
    </div>
  );
}
