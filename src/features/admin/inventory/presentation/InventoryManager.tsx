'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, RefreshCw, XCircle, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Product, ProductVariant, ParentProduct, ProductHighlight } from '@/shared/domain/types';
import { MAX_GALLERY_IMAGES } from '@/features/product/domain/gallery';
import { HIGHLIGHT_ICON_KEYS, MAX_HIGHLIGHTS } from '@/features/product/domain/highlights';
import { motion, AnimatePresence } from 'motion/react';
import { fetchAllProductsForAdmin } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import {
  fetchCategories,
  type CategoryDoc,
} from '@/features/catalog/infrastructure/firestoreCategoriesRepository';
import { saveProduct, deleteProduct } from '../infrastructure/firestoreProductAdminRepository';
import { uploadProductImage } from '../infrastructure/productImageUpload';
import { fetchParentProducts } from '@/features/admin/parentProducts/infrastructure/firestoreParentProductsAdminRepository';
import { fetchSizeCharts } from '@/features/admin/sizeCharts/infrastructure/firestoreSizeChartsRepository';
import type { SizeChart } from '@/shared/domain/types';
import ImageCropperModal from './ImageCropperModal';
import { pruneSelection } from '@/features/admin/orders/domain/orderView';
import {
  adjustParentStock,
  changeParentsCategory,
  deleteProducts,
  setProductFeatured,
  setProductsActive,
} from '../infrastructure/productBulkRepository';
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  attachParentProducts,
  distinctParentIds,
  filterProducts,
  paginate,
  productStats,
  sortProducts,
  type ProductFilters,
  type ProductSort,
} from '../domain/productList';
import ProductsHeader from './list/ProductsHeader';
import ProductStatsRow from './list/ProductStatsRow';
import ProductFilterBar from './list/ProductFilterBar';
import ProductsTable, { type ProductsListProps } from './list/ProductsTable';
import ProductsGrid from './list/ProductsGrid';
import ProductBulkToolbar, { type ProductViewMode } from './list/ProductBulkToolbar';
import BulkCategoryModal from './list/BulkCategoryModal';
import BulkStockModal from './list/BulkStockModal';
import Pagination from '@/features/admin/presentation/ui/Pagination';
import ErrorBanner from '@/features/admin/presentation/ui/ErrorBanner';
import { TableCard } from '@/features/admin/presentation/ui/TableCard';

export default function InventoryManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const [listError, setListError] = useState('');

  // Parent products (own the canonical size list + per-size stock, managed on the Parent Products tab)
  const [parentProducts, setParentProducts] = useState<ParentProduct[]>([]);

  const refreshProducts = useCallback(async () => {
    // Only the first load shows the spinner; later reloads are silent.
    if (!hasLoadedRef.current) setProductsLoading(true);
    try {
      const [prods, parents] = await Promise.all([fetchAllProductsForAdmin(), fetchParentProducts()]);
      setParentProducts(parents);
      setProducts(attachParentProducts(prods, parents));
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Error fetching products: ', err);
      setListError('Failed to load products.');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  // Product Editor State
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editorError, setEditorError] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Temp array for design/color variants
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [productGallery, setProductGallery] = useState<string[]>([]);
  const [productHighlights, setProductHighlights] = useState<ProductHighlight[]>([]);

  // Size chart templates (reusable across products, managed on the Size Charts tab)
  const [sizeCharts, setSizeCharts] = useState<SizeChart[]>([]);

  const loadSizeCharts = useCallback(async () => {
    try {
      setSizeCharts(await fetchSizeCharts());
    } catch (err) {
      console.error('Error fetching size charts: ', err);
    }
  }, []);

  useEffect(() => {
    loadSizeCharts();
  }, [loadSizeCharts]);

  // Categories table (persisted independently, so category/
  // subcategory names survive even if no product currently uses them)
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

  // Single variant addition form state
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantColor, setNewVariantColor] = useState('#000000');
  const [newVariantImage, setNewVariantImage] = useState('');

  // Image Cropper States
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropperTarget, setCropperTarget] = useState<'primary' | 'variant' | 'gallery' | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Product form handlers
  const handleOpenCreateProduct = () => {
    setEditingProduct({
      id: `prod-${Date.now()}`,
      name: '',
      description: '',
      price: 0,
      originalPrice: undefined,
      image: '',
      category: '',
      subcategory: '',
      rating: 5,
      parentProductId: undefined,
    });
    setProductVariants([]);
    setProductGallery([]);
    setProductHighlights([]);
    setEditorError('');
    setIsEditingProduct(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct({ ...p });
    setProductVariants(p.variants || []);
    setProductGallery(p.gallery ?? []);
    setProductHighlights(p.highlights ?? []);
    setEditorError('');
    setIsEditingProduct(true);
  };

  // Pre-fills the create form from an existing product (fresh ID, everything
  // else — including the Parent Product link — carried over) so a similar
  // listing (e.g. another color) can be created without re-entering every field.
  const handleDuplicateProduct = (p: Product) => {
    setEditingProduct({ ...p, id: `prod-${Date.now()}`, name: `${p.name} (Copy)` });
    setProductVariants(p.variants || []);
    setProductGallery(p.gallery ?? []);
    setProductHighlights(p.highlights ?? []);
    setEditorError('');
    setIsEditingProduct(true);
  };

  const handleTriggerCrop = (target: 'primary' | 'variant' | 'gallery') => {
    setCropperTarget(target);
    setIsCropperOpen(true);
  };

  const handleCropComplete = async (compressedDataUrl: string) => {
    const productId = editingProduct?.id || `prod-${Date.now()}`;
    setIsUploadingImage(true);
    setEditorError('');
    try {
      if (cropperTarget === 'primary') {
        const url = await uploadProductImage(`products/${productId}/main`, compressedDataUrl);
        setEditingProduct((prev) => (prev ? { ...prev, image: url } : null));
      } else if (cropperTarget === 'variant') {
        const url = await uploadProductImage(`products/${productId}/variants/${Date.now()}`, compressedDataUrl);
        setNewVariantImage(url);
      } else if (cropperTarget === 'gallery') {
        if (productGallery.length >= MAX_GALLERY_IMAGES) return;
        const url = await uploadProductImage(`products/${productId}/gallery/${Date.now()}`, compressedDataUrl);
        setProductGallery((prev) => (prev.length >= MAX_GALLERY_IMAGES ? prev : [...prev, url]));
      }
    } catch (err: any) {
      setEditorError(err.message || 'Failed to upload image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAddVariant = () => {
    if (!newVariantName) {
      setEditorError('Please provide a variant name.');
      return;
    }
    const imageUrl = newVariantImage.trim() || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500';
    const newVariant: ProductVariant = {
      id: `var-${Date.now()}`,
      name: newVariantName,
      colorCode: newVariantColor,
      image: imageUrl,
    };
    setProductVariants((prev) => [...prev, newVariant]);
    setNewVariantName('');
    setNewVariantColor('#000000');
    setNewVariantImage('');
    setEditorError('');
  };

  const handleRemoveVariant = (varId: string) => {
    setProductVariants((prev) => prev.filter((v) => v.id !== varId));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const { id, name, description, price, image, parentProductId } = editingProduct;

    if (!id || !name || !description || price === undefined || !image) {
      setEditorError('Please fill in all required fields (ID, Name, Description, Price, Primary Image).');
      return;
    }

    if (price <= 0) {
      setEditorError('Price must be greater than 0.');
      return;
    }

    if (!parentProductId) {
      setEditorError('Please select a Parent Product — it is what supplies this product\'s sizes and stock.');
      return;
    }

    // Category/subcategory belong to the parent product; products store a denormalized copy.
    const parent = parentProducts.find((pp) => pp.id === parentProductId);
    const category = parent?.category ?? '';
    const subcategory = parent?.subcategory ?? '';

    setIsSavingProduct(true);
    setEditorError('');

    try {
      await saveProduct({
        id,
        name,
        description,
        price: Number(price),
        originalPrice: editingProduct.originalPrice ? Number(editingProduct.originalPrice) : null,
        image,
        category,
        subcategory,
        rating: editingProduct.rating || 5,
        parentProductId,
        variants: productVariants,
        sizeChartId: editingProduct.sizeChartId || null,
        gallery: productGallery,
        highlights: productHighlights.filter((h) => h.title.trim()),
      });
      await refreshProducts();
      setIsEditingProduct(false);
      setEditingProduct(null);
    } catch (err: any) {
      console.error('Error saving product: ', err);
      setEditorError(err.message || 'Failed to save product.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm('Are you sure you want to delete this product from your catalog?')) return;
    try {
      await deleteProduct(prodId);
      await refreshProducts();
    } catch (err) {
      console.error('Error deleting product: ', err);
      setListError('Failed to delete product.');
    }
  };

  // Splits a product's embedded Design/Color Variants out into their own
  // standalone product documents (so each design becomes independently
  // listed/linkable/feedable), instead of one doc with a `variants[]` array.
  // The original doc is kept and becomes the first design; the rest become
  // new docs. All split-off products keep the same parentProductId, so sizes
  // & stock stay pooled together exactly as they were before the split.
  const [splittingProductId, setSplittingProductId] = useState<string | null>(null);

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'variant';

  const handleSplitVariants = async (p: Product) => {
    if (!p.variants || p.variants.length === 0) return;

    const designNames = p.variants.map((v) => v.name).join(', ');
    const confirmed = window.confirm(
      `Split "${p.name}" into ${p.variants.length} separate products — one per design (${designNames})?\n\n` +
        `"${p.name}" will keep its current ID and become the "${p.variants[0].name}" design; ` +
        `${p.variants.length - 1} new product(s) will be created for the remaining designs. ` +
        `All of them will keep sharing the same Parent Product (sizes & stock).`
    );
    if (!confirmed) return;

    setSplittingProductId(p.id);
    try {
      const [firstVariant, ...restVariants] = p.variants;
      const usedIds = new Set(products.map((prod) => prod.id));

      await saveProduct({
        id: p.id,
        name: `${p.name} - ${firstVariant.name}`,
        description: p.description,
        price: p.price,
        originalPrice: p.originalPrice ?? null,
        image: firstVariant.image || p.image,
        category: p.category,
        subcategory: p.subcategory || '',
        rating: p.rating,
        parentProductId: p.parentProductId || null,
        variants: [],
        sizeChartId: p.sizeChartId || null,
      });
      usedIds.add(p.id);

      for (const variant of restVariants) {
        let newId = `${p.id}-${slugify(variant.name)}`;
        let suffix = 2;
        while (usedIds.has(newId)) {
          newId = `${p.id}-${slugify(variant.name)}-${suffix}`;
          suffix += 1;
        }
        usedIds.add(newId);

        await saveProduct({
          id: newId,
          name: `${p.name} - ${variant.name}`,
          description: p.description,
          price: p.price,
          originalPrice: p.originalPrice ?? null,
          image: variant.image || p.image,
          category: p.category,
          subcategory: p.subcategory || '',
          rating: p.rating,
          parentProductId: p.parentProductId || null,
          variants: [],
          sizeChartId: p.sizeChartId || null,
        });
      }

      await refreshProducts();
    } catch (err: any) {
      console.error('Error splitting product into design variants: ', err);
      setListError(err.message || 'Failed to split product into separate designs.');
    } finally {
      setSplittingProductId(null);
    }
  };

  const filterCategories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();

  // List state: filters, sort, pagination and selection
  const PAGE_SIZE = 20;
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<ProductSort>('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = useMemo(() => sortProducts(filterProducts(products, filters), sort), [products, filters, sort]);
  const pageData = paginate(filtered, page, PAGE_SIZE);
  const stats = useMemo(() => productStats(products), [products]);

  // Selection only ever covers products visible under the current filters (all pages).
  useEffect(() => {
    setSelectedIds((prev) => pruneSelection(prev, filtered.map((p) => p.id)));
  }, [filtered]);

  const pageIds = pageData.items.map((p) => p.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const someOnPageSelected = pageIds.some((id) => selectedIds.includes(id));

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAllOnPage = () =>
    setSelectedIds((prev) =>
      allOnPageSelected ? prev.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...prev, ...pageIds]))
    );

  const handleFilters = (f: ProductFilters) => {
    setFilters(f);
    setPage(1);
  };
  const handleSort = (s: ProductSort) => {
    setSort(s);
    setPage(1);
  };
  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSort('');
    setPage(1);
  };

  // Bulk actions
  const [viewMode, setViewMode] = useState<ProductViewMode>('list');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkModal, setBulkModal] = useState<'category' | 'stock' | null>(null);
  const [bulkModalError, setBulkModalError] = useState('');
  const bulkParents = useMemo(() => distinctParentIds(products, selectedIds), [products, selectedIds]);

  const openBulkModal = (m: 'category' | 'stock') => {
    setBulkModalError('');
    setBulkModal(m);
  };

  // Runs a repository call, silently reloads, and reports errors inline
  // (inside the open modal when there is one, otherwise in the list banner).
  const runBulk = async (action: () => Promise<void>, inModal = false) => {
    setBulkBusy(true);
    setBulkModalError('');
    try {
      await action();
      await refreshProducts();
      if (inModal) setBulkModal(null);
    } catch (err: any) {
      const msg = err.message || 'Bulk action failed.';
      if (inModal) setBulkModalError(msg);
      else setListError(msg);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = () => {
    const n = selectedIds.length;
    if (n === 0 || !window.confirm(`Delete ${n} products? This cannot be undone.`)) return;
    runBulk(() => deleteProducts(selectedIds));
  };

  // Optimistic featured toggle; reverts and reports inline on failure.
  const [featuredPendingIds, setFeaturedPendingIds] = useState<string[]>([]);
  const handleToggleFeatured = async (p: Product, featured: boolean) => {
    if (featuredPendingIds.includes(p.id)) return;
    setFeaturedPendingIds((prev) => [...prev, p.id]);
    const apply = (value: boolean) =>
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isFeatured: value } : x)));
    apply(featured);
    try {
      await setProductFeatured(p.id, featured);
    } catch (err: any) {
      apply(!featured);
      setListError(err.message || `Failed to update featured flag for "${p.name}".`);
    } finally {
      setFeaturedPendingIds((prev) => prev.filter((x) => x !== p.id));
    }
  };

  const listProps: ProductsListProps = {
    products: pageData.items,
    selectedIds,
    onToggle: toggleSelected,
    onToggleAllOnPage: toggleAllOnPage,
    allOnPageSelected,
    someOnPageSelected,
    onEdit: handleOpenEditProduct,
    onDuplicate: handleDuplicateProduct,
    onSplit: handleSplitVariants,
    onDelete: (p) => handleDeleteProduct(p.id),
    onToggleFeatured: handleToggleFeatured,
    featuredPendingIds,
    splittingProductId,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ProductsHeader onAdd={handleOpenCreateProduct} />

      <ProductStatsRow stats={stats} />

      {productsLoading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#EEEEEE]">
          <RefreshCw className="h-6 w-6 text-black animate-spin mb-4" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#717171]">Synchronizing inventory...</span>
        </div>
      )}

      <ProductFilterBar
        filters={filters}
        sort={sort}
        categories={filterCategories}
        activeCount={activeFilterCount(filters, sort)}
        onFilters={handleFilters}
        onSort={handleSort}
        onReset={handleResetFilters}
      />

      {/* Product Form Drawer/Modal overlay */}
      <AnimatePresence>
        {isEditingProduct && editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingProduct(false)}
              className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 15 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-[#EEEEEE] bg-[#FDFDFD] shadow-2xl p-6 sm:p-8 flex flex-col"
              id="product-edit-form-panel"
            >
              <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-4 mb-6">
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-black">
                  {editingProduct.id && products.find((p) => p.id === editingProduct.id)
                    ? 'Edit Catalog Product'
                    : 'Add New Catalog Product'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingProduct(false)}
                  className="text-[#717171] hover:text-black border border-[#EEEEEE] p-1.5"
                >
                  <XCircle className="h-4.5 w-4.5" />
                </button>
              </div>

              {editorError && (
                <div className="bg-red-50 text-red-800 border border-red-200 text-xs p-4 mb-6 font-medium">
                  {editorError}
                </div>
              )}

              <form onSubmit={handleSaveProduct} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Product ID */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                      Product ID (Unique)*
                    </label>
                    <input
                      type="text"
                      required
                      value={editingProduct.id || ''}
                      onChange={(e) => setEditingProduct((prev) => ({ ...prev, id: e.target.value }))}
                      disabled={!!products.find((p) => p.id === editingProduct.id)}
                      placeholder="e.g. prod-jersey-limited"
                      className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none disabled:bg-[#F5F5F5] disabled:text-[#919191]"
                    />
                  </div>

                  {/* Product Name */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                      Product Title*
                    </label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name || ''}
                      onChange={(e) => setEditingProduct((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Classic Linen Overshirt"
                      className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Price */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                      Sale Price ($)*
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingProduct.price || ''}
                      onChange={(e) => setEditingProduct((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      placeholder="e.g. 45.00"
                      className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                    />
                  </div>

                  {/* Original Price */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                      Original Price (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingProduct.originalPrice || ''}
                      onChange={(e) =>
                        setEditingProduct((prev) => ({ ...prev, originalPrice: parseFloat(e.target.value) || undefined }))
                      }
                      placeholder="e.g. 60.00"
                      className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                {/* Category (read-only: owned by the parent product) */}
                {(() => {
                  const selectedParent = parentProducts.find((pp) => pp.id === editingProduct.parentProductId);
                  return (
                    <p className="text-[11px] text-[#717171]" id="product-parent-category">
                      {selectedParent
                        ? `Category: ${selectedParent.category || 'Uncategorized'} / Subcategory: ${selectedParent.subcategory || 'None'} (from parent product)`
                        : 'Category and subcategory come from the parent product. Select a parent product to apply them.'}
                    </p>
                  );
                })()}

                {/* Primary Image */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                    Product Image* (Paste URL or Upload Directly)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        required
                        value={editingProduct.image || ''}
                        onChange={(e) => setEditingProduct((prev) => ({ ...prev, image: e.target.value }))}
                        placeholder="Paste image URL (or upload directly)"
                        className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTriggerCrop('primary')}
                      disabled={isUploadingImage}
                      className="bg-black hover:bg-[#333333] text-white text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 transition-colors flex items-center justify-center space-x-1.5 shrink-0 disabled:bg-[#717171] disabled:cursor-not-allowed disabled:hover:bg-[#717171]"
                    >
                      {isUploadingImage && cropperTarget === 'primary' ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      <span>{isUploadingImage && cropperTarget === 'primary' ? 'Uploading…' : 'Upload & Crop'}</span>
                    </button>
                  </div>

                  {/* Live Image Preview Thumbnail */}
                  {editingProduct.image && (
                    <div className="mt-3 flex items-center space-x-3 bg-[#FAF9F6] p-2.5 border border-[#EEEEEE]">
                      <img
                        src={editingProduct.image}
                        alt="Primary Product Preview"
                        className="h-14 w-14 object-cover border border-[#EEEEEE]"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Invalid+Image';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-[#717171]">Current Selection</span>
                        <span className="block text-[10px] text-black font-semibold truncate font-mono">
                          {editingProduct.image.startsWith('data:')
                            ? `Direct Upload (Compressed Base64: ${Math.round(editingProduct.image.length / 1024)} KB)`
                            : editingProduct.image}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingProduct((prev) => (prev ? { ...prev, image: '' } : null))}
                        className="text-red-600 hover:text-red-800 text-[10px] font-bold uppercase tracking-wider px-2"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Gallery images */}
                <div className="border-t border-[#EEEEEE] pt-5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                    Gallery images
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {productGallery.map((url, i) => (
                      <div key={`${url}-${i}`} className="w-20">
                        <div className="relative h-20 w-20 border border-[#EEEEEE] bg-[#FAF9F6]">
                          <img src={url} alt={`Gallery image ${i + 1}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            aria-label={`Remove gallery image ${i + 1}`}
                            onClick={() => setProductGallery((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-0 right-0 bg-black text-white p-0.5 hover:bg-[#333333]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="mt-1 flex justify-between">
                          <button
                            type="button"
                            aria-label={`Move gallery image ${i + 1} left`}
                            disabled={i === 0}
                            onClick={() =>
                              setProductGallery((prev) => {
                                const next = [...prev];
                                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                                return next;
                              })
                            }
                            className="border border-[#EEEEEE] p-0.5 text-black disabled:text-[#CCCCCC] disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Move gallery image ${i + 1} right`}
                            disabled={i === productGallery.length - 1}
                            onClick={() =>
                              setProductGallery((prev) => {
                                const next = [...prev];
                                [next[i], next[i + 1]] = [next[i + 1], next[i]];
                                return next;
                              })
                            }
                            className="border border-[#EEEEEE] p-0.5 text-black disabled:text-[#CCCCCC] disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {productGallery.length < MAX_GALLERY_IMAGES && (
                      <button
                        type="button"
                        onClick={() => handleTriggerCrop('gallery')}
                        disabled={isUploadingImage}
                        className="h-20 w-20 border border-dashed border-[#717171] text-[10px] font-bold uppercase tracking-wider text-[#717171] hover:border-black hover:text-black flex flex-col items-center justify-center space-y-1 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUploadingImage && cropperTarget === 'gallery' ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        <span>{isUploadingImage && cropperTarget === 'gallery' ? 'Uploading…' : 'Add image'}</span>
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-[10px] text-[#717171]">
                    Extra photos shown as thumbnails on the product page (up to 8)
                  </p>
                </div>

                {/* Feature row */}
                <div className="border-t border-[#EEEEEE] pt-5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                    Feature row
                  </span>
                  <div className="space-y-2">
                    {productHighlights.map((h, i) => (
                      <div key={i} className="flex flex-col sm:flex-row gap-2">
                        <select
                          aria-label={`Feature ${i + 1} icon`}
                          value={h.icon}
                          onChange={(e) =>
                            setProductHighlights((prev) =>
                              prev.map((x, idx) => (idx === i ? { ...x, icon: e.target.value as ProductHighlight['icon'] } : x)),
                            )
                          }
                          className="rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none sm:w-40"
                        >
                          {HIGHLIGHT_ICON_KEYS.map((key) => (
                            <option key={key} value={key}>
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          aria-label={`Feature ${i + 1} title`}
                          value={h.title}
                          onChange={(e) =>
                            setProductHighlights((prev) => prev.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))
                          }
                          placeholder="180 GSM"
                          className="flex-1 rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                        />
                        <input
                          type="text"
                          aria-label={`Feature ${i + 1} subtitle`}
                          value={h.subtitle ?? ''}
                          onChange={(e) =>
                            setProductHighlights((prev) => prev.map((x, idx) => (idx === i ? { ...x, subtitle: e.target.value } : x)))
                          }
                          placeholder="Lycra Cotton"
                          className="flex-1 rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                        />
                        <button
                          type="button"
                          aria-label={`Remove feature ${i + 1}`}
                          onClick={() => setProductHighlights((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-red-600 hover:text-red-800 text-[10px] font-bold uppercase tracking-wider px-2"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setProductHighlights((prev) => [...prev, { icon: HIGHLIGHT_ICON_KEYS[0], title: '', subtitle: '' }])}
                    disabled={productHighlights.length >= MAX_HIGHLIGHTS}
                    className="mt-3 bg-black hover:bg-[#333333] text-white text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 transition-colors disabled:bg-[#717171] disabled:cursor-not-allowed"
                  >
                    Add feature
                  </button>
                  <p className="mt-2 text-[10px] text-[#717171]">
                    Shown in a row under Add to Cart; replaces the default trust row. Leave empty to keep the default.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                    Product Description*
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Write dynamic sales copy or specs..."
                    className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>

                {/* Parent Product picker (supplies sizes & per-size stock) */}
                <div className="border-t border-[#EEEEEE] pt-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#717171]">
                      Parent Product*
                    </span>
                    <Link
                      href="/admin/parent-products"
                      className="text-[9px] font-bold uppercase tracking-wider text-black border-b border-black hover:opacity-70"
                    >
                      Manage Parent Products
                    </Link>
                  </div>

                  {editingProduct.id && products.find((p) => p.id === editingProduct.id) && !editingProduct.parentProductId && (
                    <div className="bg-red-50 text-red-800 border border-red-200 text-[10px] p-3 mb-2 font-medium">
                      This product has no linked Parent Product — it has zero stock and will show as unavailable on
                      the storefront. Select one below.
                    </div>
                  )}

                  <select
                    required
                    value={editingProduct.parentProductId || ''}
                    onChange={(e) =>
                      setEditingProduct((prev) => ({ ...prev, parentProductId: e.target.value || undefined }))
                    }
                    className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="" disabled>
                      Select a parent product…
                    </option>
                    {parentProducts.map((pp) => (
                      <option key={pp.id} value={pp.id}>
                        {pp.name}
                      </option>
                    ))}
                  </select>

                  {editingProduct.parentProductId &&
                    (() => {
                      const pp = parentProducts.find((p) => p.id === editingProduct.parentProductId);
                      if (!pp) return null;
                      return (
                        <div className="mt-3 bg-[#FAF9F6] border border-[#EEEEEE] p-3">
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-[#717171] mb-2">
                            Sizes & Stock (read-only — edit on the Parent Products tab)
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {pp.sizeOrder.map((sz) => (
                              <span
                                key={sz}
                                className="inline-flex items-center gap-1 px-2 py-1 border border-[#EEEEEE] bg-white text-[10px] font-mono font-bold text-black"
                              >
                                {sz}: {pp.stockBySize[sz] ?? 0}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                </div>

                {/* Size Chart template picker */}
                <div className="border-t border-[#EEEEEE] pt-5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                    Size Chart (Optional)
                  </span>
                  <select
                    value={editingProduct.sizeChartId || ''}
                    onChange={(e) =>
                      setEditingProduct((prev) => ({ ...prev, sizeChartId: e.target.value || undefined }))
                    }
                    className="w-full rounded-lg border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="">None</option>
                    {sizeCharts.map((chart) => (
                      <option key={chart.id} value={chart.id}>
                        {chart.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[#919191] mt-1.5">
                    Manage reusable measurement templates on the Size Charts tab.
                  </p>
                </div>

                {/* Design/Color Variants list builder */}
                <div className="border-t border-[#EEEEEE] pt-5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-3">
                    Design/Color Variants (Auto-Swaps on catalog list page)
                  </span>

                  {/* Current Variants list */}
                  {productVariants.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 mb-4">
                      {productVariants.map((v, i) => (
                        <div
                          key={v.id || i}
                          className="flex items-center gap-2 px-3 py-1.5 border border-[#EEEEEE] bg-[#F9F9F9] text-xs font-semibold text-black"
                        >
                          {v.colorCode && (
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: v.colorCode }}
                            />
                          )}
                          <span>{v.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(v.id)}
                            className="text-red-600 hover:text-red-800 font-bold ml-1.5 text-[10px]"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Variant mini-form */}
                  <div className="bg-[#FAF9F6] border border-[#EEEEEE] p-4 space-y-3">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-[#717171]">
                      Add New Color/Design Variant
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newVariantName}
                        onChange={(e) => setNewVariantName(e.target.value)}
                        placeholder="Variant name (e.g. Sage Green)"
                        className="rounded-lg border border-[#EEEEEE] bg-white py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#717171] font-bold uppercase">Color:</span>
                        <input
                          type="color"
                          value={newVariantColor}
                          onChange={(e) => setNewVariantColor(e.target.value)}
                          className="h-8 w-12 p-0.5 border border-[#EEEEEE] bg-white cursor-pointer"
                        />
                        <span className="text-xs font-mono text-black font-semibold uppercase">{newVariantColor}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          value={newVariantImage}
                          onChange={(e) => setNewVariantImage(e.target.value)}
                          placeholder="Variant Image (Paste URL or upload below)"
                          className="flex-1 rounded-lg border border-[#EEEEEE] bg-white py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleTriggerCrop('variant')}
                          disabled={isUploadingImage}
                          className="border border-black hover:bg-[#FAF9F6] text-black text-xs font-bold uppercase tracking-widest px-4 py-2 transition-colors flex items-center justify-center space-x-1 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                        >
                          {isUploadingImage && cropperTarget === 'variant' ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          <span>{isUploadingImage && cropperTarget === 'variant' ? 'Uploading…' : 'Upload & Crop'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleAddVariant}
                          className="bg-black hover:bg-[#333333] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 transition-colors shrink-0"
                        >
                          Add Variant
                        </button>
                      </div>

                      {/* Variant Image Preview Thumbnail */}
                      {newVariantImage && (
                        <div className="flex items-center space-x-3 bg-white p-2 border border-[#EEEEEE]">
                          <img
                            src={newVariantImage}
                            alt="Variant Preview"
                            className="h-10 w-10 object-cover border border-[#EEEEEE]"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Invalid+Image';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="block text-[8px] font-bold uppercase tracking-wider text-[#717171]">Variant Selection</span>
                            <span className="block text-[10px] text-black font-semibold truncate font-mono">
                              {newVariantImage.startsWith('data:')
                                ? `Direct Upload (${Math.round(newVariantImage.length / 1024)} KB)`
                                : newVariantImage}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNewVariantImage('')}
                            className="text-red-600 hover:text-red-800 text-[9px] font-bold uppercase tracking-wider px-2"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="border-t border-[#EEEEEE] pt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingProduct(false)}
                    className="border border-[#EEEEEE] hover:border-black text-black text-xs font-bold uppercase tracking-widest px-6 py-3.5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProduct}
                    className="bg-black hover:bg-[#333333] text-white text-xs font-bold uppercase tracking-widest px-8 py-3.5 transition-colors flex items-center justify-center space-x-2 disabled:bg-[#717171]"
                  >
                    {isSavingProduct && <RefreshCw className="h-4 w-4 animate-spin" />}
                    <span>{isSavingProduct ? 'Saving Product...' : 'Save Product Data'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {listError && <ErrorBanner message={listError} onDismiss={() => setListError('')} />}

      <TableCard>
        <ProductBulkToolbar
          selectedCount={selectedIds.length}
          allOnPageSelected={allOnPageSelected}
          someOnPageSelected={someOnPageSelected}
          onToggleAllOnPage={toggleAllOnPage}
          onEdit={() => {
            const p = products.find((x) => x.id === selectedIds[0]);
            if (p) handleOpenEditProduct(p);
          }}
          onChangeCategory={() => openBulkModal('category')}
          onUpdateStock={() => openBulkModal('stock')}
          onChangeStatus={(active) => runBulk(() => setProductsActive(selectedIds, active))}
          onDelete={handleBulkDelete}
          viewMode={viewMode}
          onViewMode={setViewMode}
          busy={bulkBusy}
        >
          <Pagination
            id="inventory-pagination"
            from={pageData.from}
            to={pageData.to}
            total={pageData.total}
            page={pageData.page}
            totalPages={pageData.totalPages}
            onPage={setPage}
          />
        </ProductBulkToolbar>
        {viewMode === 'grid' ? <ProductsGrid {...listProps} /> : <ProductsTable {...listProps} />}
      </TableCard>

      {bulkModal === 'category' && (
        <BulkCategoryModal
          parentCount={bulkParents.parentIds.length}
          productCount={selectedIds.length}
          skipped={bulkParents.skipped}
          categories={categoryDocs}
          busy={bulkBusy}
          error={bulkModalError}
          onClose={() => setBulkModal(null)}
          onApply={(category, subcategory) =>
            runBulk(() => changeParentsCategory(bulkParents.parentIds, category, subcategory), true)
          }
        />
      )}
      {bulkModal === 'stock' && (
        <BulkStockModal
          parentCount={bulkParents.parentIds.length}
          skipped={bulkParents.skipped}
          busy={bulkBusy}
          error={bulkModalError}
          onClose={() => setBulkModal(null)}
          onApply={(mode, amount) => runBulk(() => adjustParentStock(bulkParents.parentIds, mode, amount), true)}
        />
      )}

      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => {
          setIsCropperOpen(false);
          setCropperTarget(null);
        }}
        onCropComplete={handleCropComplete}
        title={
          cropperTarget === 'primary'
            ? 'Crop & Optimize Primary Image'
            : cropperTarget === 'gallery'
              ? 'Crop & Optimize Gallery Image'
              : 'Crop & Optimize Variant Image'
        }
      />
    </div>
  );
}
