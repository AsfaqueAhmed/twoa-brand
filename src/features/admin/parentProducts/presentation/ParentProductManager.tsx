'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, XCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ParentProduct, ParentImage } from '@/shared/domain/types';
import {
  fetchParentProducts,
  saveParentProduct,
  deleteParentProduct,
} from '../infrastructure/firestoreParentProductsAdminRepository';
import { fetchCategories, type CategoryDoc } from '@/features/catalog/infrastructure/firestoreCategoriesRepository';
import { fetchAllProductsForAdmin } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import { paginate } from '@/features/admin/inventory/domain/productList';
import Pagination from '@/features/admin/presentation/ui/Pagination';
import ErrorBanner from '@/features/admin/presentation/ui/ErrorBanner';
import { TableCard } from '@/features/admin/presentation/ui/TableCard';
import {
  DEFAULT_PARENT_FILTERS,
  activeParentFilterCount,
  filterParents,
  linkedProductCounts,
  parentCategoryFilterOptions,
  parentStats,
  sortParents,
  type ParentFilters,
  type ParentSort,
} from '../domain/parentList';
import { validateParentCategory } from '../domain/parentCategory';
import CategoryFields from './CategoryFields';
import ParentStatsRow from './list/ParentStatsRow';
import ParentFilterBar from './list/ParentFilterBar';
import ParentProductsTable from './list/ParentProductsTable';
import { uploadProductImage } from '@/features/admin/inventory/infrastructure/productImageUpload';
import ImageCropperModal from '@/features/admin/inventory/presentation/ImageCropperModal';
import ParentImagesField from './ParentImagesField';
import { getParentImages, MAX_PARENT_IMAGES, nextImageTitle, primaryImageUrl, sanitizeParentImages } from '@/features/catalog/domain/parentImages';

interface SizeRow {
  size: string;
  stock: number;
}

interface FormState {
  id: string;
  name: string;
  images: ParentImage[];
  category: string;
  subcategory: string;
  rows: SizeRow[];
}

const PAGE_SIZE = 20;

const emptyForm: FormState = { id: '', name: '', images: [], category: '', subcategory: '', rows: [] };

export default function ParentProductManager() {
  const [parentProducts, setParentProducts] = useState<ParentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingExistingId, setIsEditingExistingId] = useState<string | null>(null);
  const [previousSizeOrder, setPreviousSizeOrder] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPersistingCategory, setIsPersistingCategory] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [categoryDocs, setCategoryDocs] = useState<CategoryDoc[]>([]);
  const loadCategories = useCallback(async () => {
    try {
      setCategoryDocs(await fetchCategories());
    } catch (err) {
      console.error('Error fetching categories: ', err);
    }
  }, []);
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const [linked, setLinked] = useState<Map<string, number> | null>(null);
  const [listError, setListError] = useState('');
  const [filters, setFilters] = useState<ParentFilters>(DEFAULT_PARENT_FILTERS);
  const [sort, setSort] = useState<ParentSort>('');
  const [page, setPage] = useState(1);
  const [loadFailed, setLoadFailed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [listError]);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    // Only the first load shows the spinner; later reloads are silent.
    if (!hasLoadedRef.current) setLoading(true);
    const [parentsRes, productsRes] = await Promise.allSettled([fetchParentProducts(), fetchAllProductsForAdmin()]);
    if (parentsRes.status === 'fulfilled') {
      setParentProducts(parentsRes.value);
      hasLoadedRef.current = true;
      setLoadFailed(false);
      if (productsRes.status === 'fulfilled') {
        setLinked(linkedProductCounts(productsRes.value));
        setListError('');
      } else {
        console.error('Error fetching products: ', productsRes.reason);
        setLinked(null);
        setListError('Could not load linked product counts. Parent products are shown without them.');
      }
    } else {
      console.error('Error fetching parent products: ', parentsRes.reason);
      setLoadFailed(true);
      setListError('Failed to load parent products.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = useMemo(() => parentStats(parentProducts), [parentProducts]);
  const visible = useMemo(
    () => sortParents(filterParents(parentProducts, filters), sort, linked ?? new Map()),
    [parentProducts, filters, sort, linked],
  );
  const categoryOptions = useMemo(() => parentCategoryFilterOptions(parentProducts), [parentProducts]);
  const pageData = paginate(visible, page, PAGE_SIZE);
  const activeCount = activeParentFilterCount(filters, sort);
  const hasData = parentProducts.length > 0;
  const failedEmpty = loadFailed && !hasData && !loading;

  const openCreate = () => {
    setForm({ id: `parent-${Date.now()}`, name: '', images: [], category: '', subcategory: '', rows: [{ size: '', stock: 0 }] });
    setIsEditingExistingId(null);
    setPreviousSizeOrder([]);
    setError('');
    setIsEditing(true);
  };

  const openEdit = (pp: ParentProduct) => {
    setForm({
      id: pp.id,
      name: pp.name,
      images: getParentImages(pp),
      category: pp.category || '',
      subcategory: pp.subcategory || '',
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

  const handleCropComplete = async (compressedDataUrl: string) => {
    const formId = form.id;
    setIsUploadingImage(true);
    setError('');
    try {
      const url = await uploadProductImage(`parent-products/${formId}/${Date.now()}`, compressedDataUrl);
      setForm((prev) =>
        prev.id === formId && prev.images.length < MAX_PARENT_IMAGES && !prev.images.some((i) => i.url === url)
          ? { ...prev, images: [...prev.images, { title: nextImageTitle(prev.images), url }] }
          : prev,
      );
    } catch (err: any) {
      setError(err.message || 'Failed to upload image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Please provide a name.');
      return;
    }
    const categoryError = validateParentCategory(form.category, form.subcategory, categoryDocs);
    if (categoryError) {
      setError(categoryError);
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
      const images = sanitizeParentImages(form.images);
      const sizeOrder = labels;
      const stockBySize = Object.fromEntries(form.rows.map((r) => [r.size.trim(), r.stock]));
      await saveParentProduct(
        {
          id: form.id,
          name: form.name.trim(),
          image: primaryImageUrl(images),
          images,
          category: form.category.trim(),
          subcategory: form.subcategory.trim(),
          sizeOrder,
          stockBySize,
        },
        previousSizeOrder,
      );
      await refresh();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save parent product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (pp: ParentProduct) => {
    if ((linked?.get(pp.id) ?? 0) > 0) return;
    const prompt =
      linked === null
        ? `Linked product counts could not be loaded. Delete "${pp.name}" anyway? It will be refused if products still use it.`
        : `Delete parent product "${pp.name}"? This cannot be undone.`;
    if (!window.confirm(prompt)) return;
    try {
      await deleteParentProduct(pp.id, pp.sizeOrder);
      await refresh();
    } catch (err: any) {
      setListError(err.message || 'Failed to delete parent product.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Parent Products</h1>
          <p className="mt-1 text-sm text-[#717171]">Manage the sizes and stock shared by your products.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333333]"
          id="admin-add-parentproduct-btn"
        >
          <Plus className="h-4 w-4" />
          <span>Add Parent Product</span>
        </button>
      </div>

      {!loading && !failedEmpty && <ParentStatsRow stats={stats} />}

      {loading && parentProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#EEEEEE] py-16">
          <RefreshCw className="h-5 w-5 animate-spin text-[#717171]" />
          <p className="mt-3 text-xs font-semibold text-[#717171]">Loading parent products...</p>
        </div>
      )}

      {!failedEmpty && (
      <ParentFilterBar
        filters={filters}
        sort={sort}
        categories={categoryOptions}
        activeCount={activeCount}
        onFilters={(f) => {
          setFilters(f);
          setPage(1);
        }}
        onSort={(v) => {
          setSort(v);
          setPage(1);
        }}
        onReset={() => {
          setFilters(DEFAULT_PARENT_FILTERS);
          setSort('');
          setPage(1);
        }}
      />
      )}

      {listError && !(!failedEmpty && dismissed) && (
        <ErrorBanner message={listError} onRetry={refresh} onDismiss={failedEmpty ? undefined : () => setDismissed(true)} />
      )}

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
              className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg border border-[#EEEEEE] bg-[#FDFDFD] shadow-2xl p-6 sm:p-8"
            >
              <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-4 mb-6">
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-black">
                  {isEditingExistingId ? 'Edit Parent Product' : 'Add Parent Product'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isUploadingImage}
                  className="text-[#717171] hover:text-black border border-[#EEEEEE] p-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>

                <CategoryFields
                  categories={categoryDocs}
                  category={form.category}
                  subcategory={form.subcategory}
                  onChange={(category, subcategory) => setForm((prev) => ({ ...prev, category, subcategory }))}
                  onPersisted={loadCategories}
                  onError={setError}
                  onBusyChange={setIsPersistingCategory}
                />

                <ParentImagesField
                  images={form.images}
                  onChange={(images) => setForm((prev) => ({ ...prev, images }))}
                  onUpload={() => setIsCropperOpen(true)}
                  uploading={isUploadingImage}
                />

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
                                  className="w-24 rounded-lg border border-[#EEEEEE] bg-white py-1.5 px-2 text-[11px] font-mono font-bold text-black focus:border-black focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="number"
                                  value={row.stock}
                                  onChange={(e) => handleRowStockChange(rowIdx, e.target.value)}
                                  placeholder="0"
                                  className="w-24 rounded-lg border border-[#EEEEEE] bg-white py-1.5 px-2 text-[11px] font-mono text-black focus:border-black focus:outline-none"
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
                    disabled={isUploadingImage}
                    className="border border-[#EEEEEE] hover:border-black text-black text-xs font-bold uppercase tracking-widest px-6 py-3.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isPersistingCategory || isUploadingImage}
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

      {!(loading && parentProducts.length === 0) && !failedEmpty && (
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
          <ParentProductsTable
            parents={pageData.items}
            emptyText={hasData ? 'No parent products found.' : 'No parent products yet.'}
            linked={linked} onEdit={openEdit}
            onDelete={handleDelete}
          />
        </TableCard>
      )}

      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        onCropComplete={handleCropComplete}
        title="Crop & Optimize Parent Product Image"
      />
    </div>
  );
}
