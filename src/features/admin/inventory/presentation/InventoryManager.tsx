'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, Search, XCircle, Upload } from 'lucide-react';
import Link from 'next/link';
import type { Product, ProductVariant, ParentProduct } from '@/shared/domain/types';
import { motion, AnimatePresence } from 'motion/react';
import { fetchAllProducts } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import {
  fetchCategories,
  persistNewCategory,
  persistNewSubcategory,
  type CategoryDoc,
} from '../infrastructure/firestoreCategoriesRepository';
import { saveProduct, deleteProduct } from '../infrastructure/firestoreProductAdminRepository';
import { fetchParentProducts } from '@/features/admin/parentProducts/infrastructure/firestoreParentProductsAdminRepository';
import { fetchSizeCharts } from '@/features/admin/sizeCharts/infrastructure/firestoreSizeChartsRepository';
import type { SizeChart } from '@/shared/domain/types';
import ImageCropperModal from './ImageCropperModal';
import { formatCurrency } from '@/shared/lib/formatCurrency';

export default function InventoryManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const refreshProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      setProducts(await fetchAllProducts());
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

  // Parent products (own the canonical size list + per-size stock, managed on the Parent Products tab)
  const [parentProducts, setParentProducts] = useState<ParentProduct[]>([]);

  const loadParentProducts = useCallback(async () => {
    try {
      setParentProducts(await fetchParentProducts());
    } catch (err) {
      console.error('Error fetching parent products: ', err);
    }
  }, []);

  useEffect(() => {
    loadParentProducts();
  }, [loadParentProducts]);

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

  // Categories collection (persisted independently in Firestore, so category/
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

  // New category addition state
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // New subcategory addition state
  const [isAddingNewSubcategory, setIsAddingNewSubcategory] = useState(false);
  const [newSubcategoryInput, setNewSubcategoryInput] = useState('');

  // Single variant addition form state
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantColor, setNewVariantColor] = useState('#000000');
  const [newVariantImage, setNewVariantImage] = useState('');

  // Image Cropper States
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropperTarget, setCropperTarget] = useState<'primary' | 'variant' | null>(null);

  // Firestore per-document hard limit is 1 MiB; block new image uploads at 90% of that.
  const MAX_DOC_BYTES = 1048576;
  const UPLOAD_BLOCK_RATIO = 0.9;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const estimateDocSizeBytes = () => {
    if (!editingProduct) return 0;
    const payload = {
      id: editingProduct.id,
      name: editingProduct.name,
      description: editingProduct.description,
      price: editingProduct.price,
      originalPrice: editingProduct.originalPrice,
      image: editingProduct.image,
      category: editingProduct.category,
      subcategory: editingProduct.subcategory,
      rating: editingProduct.rating,
      parentProductId: editingProduct.parentProductId,
      variants: productVariants,
      sizeChartId: editingProduct.sizeChartId,
    };
    return new TextEncoder().encode(JSON.stringify(payload)).length;
  };

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
    setEditorError('');
    setIsAddingNewCategory(false);
    setNewCategoryInput('');
    setIsAddingNewSubcategory(false);
    setNewSubcategoryInput('');
    setIsEditingProduct(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct({ ...p });
    setProductVariants(p.variants || []);
    setEditorError('');
    setIsAddingNewCategory(false);
    setNewCategoryInput('');
    setIsAddingNewSubcategory(false);
    setNewSubcategoryInput('');
    setIsEditingProduct(true);
  };

  const handleConfirmNewCategory = async () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    setEditingProduct((prev) => (prev ? { ...prev, category: trimmed } : null));
    setIsAddingNewCategory(false);
    setNewCategoryInput('');
    await persistNewCategory(trimmed);
    await loadCategories();
  };

  const handleConfirmNewSubcategory = async () => {
    const trimmed = newSubcategoryInput.trim();
    if (!trimmed || !editingProduct?.category) return;
    setEditingProduct((prev) => (prev ? { ...prev, subcategory: trimmed } : null));
    setIsAddingNewSubcategory(false);
    setNewSubcategoryInput('');
    await persistNewSubcategory(editingProduct.category, trimmed);
    await loadCategories();
  };

  const handleTriggerCrop = (target: 'primary' | 'variant') => {
    if (estimateDocSizeBytes() / MAX_DOC_BYTES >= UPLOAD_BLOCK_RATIO) {
      setEditorError(
        'Document size has reached 90% of the Firestore 1 MiB limit. Remove an image or paste an external URL instead of uploading another.'
      );
      return;
    }
    setCropperTarget(target);
    setIsCropperOpen(true);
  };

  const handleCropComplete = (compressedDataUrl: string) => {
    if (cropperTarget === 'primary') {
      setEditingProduct((prev) => (prev ? { ...prev, image: compressedDataUrl } : null));
    } else if (cropperTarget === 'variant') {
      setNewVariantImage(compressedDataUrl);
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

    const { id, name, description, price, image, category, subcategory, parentProductId } = editingProduct;

    if (!id || !name || !description || price === undefined || !image || !category) {
      setEditorError('Please fill in all required fields (ID, Name, Description, Price, Primary Image, Category).');
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
        subcategory: subcategory || '',
        rating: editingProduct.rating || 5,
        parentProductId,
        variants: productVariants,
        sizeChartId: editingProduct.sizeChartId || null,
      });
      await refreshProducts();
      setIsEditingProduct(false);
      setEditingProduct(null);
    } catch (err: any) {
      console.error('Error saving product: ', err);
      setEditorError(err.message || 'Failed to save product in Firestore.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm('Are you sure you want to delete this product from your Firestore Catalog?')) return;
    try {
      await deleteProduct(prodId);
      await refreshProducts();
    } catch (err) {
      console.error('Error deleting product: ', err);
      alert('Failed to delete product.');
    }
  };

  // Categories: sourced from the persisted `categories` collection, merged with any
  // legacy category names still only present on existing product docs.
  const existingCategories = Array.from(
    new Set([...categoryDocs.map((c) => c.name), ...products.map((p) => p.category).filter(Boolean)])
  ).sort();

  // Subcategories for the currently selected category, same merge strategy.
  const existingSubcategories = Array.from(
    new Set([
      ...(categoryDocs.find((c) => c.name === editingProduct?.category)?.subcategories || []),
      ...products
        .filter((p) => !editingProduct?.category || p.category === editingProduct.category)
        .map((p) => p.subcategory)
        .filter((s): s is string => !!s),
    ])
  ).sort();

  // Live Firestore document size estimate for the product currently being edited
  const currentDocBytes = estimateDocSizeBytes();
  const currentDocPercent = (currentDocBytes / MAX_DOC_BYTES) * 100;
  const isUploadBlocked = currentDocPercent >= UPLOAD_BLOCK_RATIO * 100;

  // Search/Filters logic
  const [productSearch, setProductSearch] = useState('');
  const filteredInventory = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {productsLoading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#EEEEEE]">
          <RefreshCw className="h-6 w-6 text-black animate-spin mb-4" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#717171]">Synchronizing inventory...</span>
        </div>
      )}

      {/* Header Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF9F6] border border-[#EEEEEE] p-5">
        <div className="relative max-w-sm w-full">
          <Search className="absolute top-3 left-3.5 h-4 w-4 text-[#717171]" />
          <input
            type="text"
            placeholder="Search inventory products..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none transition-colors"
            id="inventory-search-input"
          />
        </div>

        <button
          onClick={handleOpenCreateProduct}
          className="flex items-center justify-center space-x-2 rounded-none bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#333333] transition-colors"
          id="admin-add-product-btn"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Product</span>
        </button>
      </div>

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
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-none border border-[#EEEEEE] bg-[#FDFDFD] shadow-2xl p-6 sm:p-8 flex flex-col"
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

              {/* Live Firestore Document Size Monitor */}
              <div
                className={`border p-4 mb-6 ${isUploadBlocked ? 'bg-red-50 border-red-200' : 'bg-[#FAF9F6] border-[#EEEEEE]'}`}
                id="doc-size-monitor"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717171]">Firestore Document Size</span>
                  <span className={`text-[10px] font-mono font-bold ${isUploadBlocked ? 'text-red-700' : 'text-black'}`}>
                    {formatBytes(currentDocBytes)} / {formatBytes(MAX_DOC_BYTES)} ({currentDocPercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#EEEEEE] overflow-hidden">
                  <div
                    className={`h-full transition-all ${isUploadBlocked ? 'bg-red-600' : 'bg-black'}`}
                    style={{ width: `${Math.min(currentDocPercent, 100)}%` }}
                  />
                </div>
                {isUploadBlocked && (
                  <p className="text-[10px] text-red-700 font-semibold mt-2">
                    90% of the Firestore 1 MiB per-document limit reached. New image uploads are disabled — remove an
                    image or use an external URL instead.
                  </p>
                )}
              </div>

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
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none disabled:bg-[#F5F5F5] disabled:text-[#919191]"
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
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
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
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
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
                      className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                      Category*
                    </label>
                    {!isAddingNewCategory ? (
                      <select
                        required
                        value={editingProduct.category || ''}
                        onChange={(e) => {
                          if (e.target.value === '__add_new__') {
                            setIsAddingNewCategory(true);
                          } else {
                            setEditingProduct((prev) => ({ ...prev, category: e.target.value }));
                          }
                        }}
                        className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                      >
                        <option value="" disabled>
                          Select a category…
                        </option>
                        {Array.from(
                          new Set([...existingCategories, ...(editingProduct.category ? [editingProduct.category] : [])])
                        )
                          .sort()
                          .map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        <option value="__add_new__">+ Add New Category</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleConfirmNewCategory();
                            }
                          }}
                          placeholder="New category name"
                          className="flex-1 rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleConfirmNewCategory}
                          className="bg-black hover:bg-[#333333] text-white text-[10px] font-bold uppercase tracking-widest px-3 shrink-0"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewCategory(false);
                            setNewCategoryInput('');
                          }}
                          className="border border-[#EEEEEE] hover:border-black text-black text-[10px] font-bold uppercase tracking-widest px-3 shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Subcategory */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                      Subcategory (Optional)
                    </label>
                    {!isAddingNewSubcategory ? (
                      <select
                        value={editingProduct.subcategory || ''}
                        onChange={(e) => {
                          if (e.target.value === '__add_new__') {
                            setIsAddingNewSubcategory(true);
                          } else {
                            setEditingProduct((prev) => ({ ...prev, subcategory: e.target.value }));
                          }
                        }}
                        className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                      >
                        <option value="">None</option>
                        {Array.from(
                          new Set([
                            ...existingSubcategories,
                            ...(editingProduct.subcategory ? [editingProduct.subcategory] : []),
                          ])
                        )
                          .sort()
                          .map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        <option value="__add_new__">+ Add New Subcategory</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={newSubcategoryInput}
                          onChange={(e) => setNewSubcategoryInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleConfirmNewSubcategory();
                            }
                          }}
                          placeholder="New subcategory name"
                          className="flex-1 rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleConfirmNewSubcategory}
                          className="bg-black hover:bg-[#333333] text-white text-[10px] font-bold uppercase tracking-widest px-3 shrink-0"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewSubcategory(false);
                            setNewSubcategoryInput('');
                          }}
                          className="border border-[#EEEEEE] hover:border-black text-black text-[10px] font-bold uppercase tracking-widest px-3 shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

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
                        className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTriggerCrop('primary')}
                      disabled={isUploadBlocked}
                      title={isUploadBlocked ? 'Document is at 90% of the Firestore size limit' : undefined}
                      className="bg-black hover:bg-[#333333] text-white text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 transition-colors flex items-center justify-center space-x-1.5 shrink-0 disabled:bg-[#717171] disabled:cursor-not-allowed disabled:hover:bg-[#717171]"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload & Crop</span>
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
                    className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
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
                    className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
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
                    className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
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
                        className="rounded-none border border-[#EEEEEE] bg-white py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
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
                          className="flex-1 rounded-none border border-[#EEEEEE] bg-white py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleTriggerCrop('variant')}
                          disabled={isUploadBlocked}
                          title={isUploadBlocked ? 'Document is at 90% of the Firestore size limit' : undefined}
                          className="border border-black hover:bg-[#FAF9F6] text-black text-xs font-bold uppercase tracking-widest px-4 py-2 transition-colors flex items-center justify-center space-x-1 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Upload & Crop</span>
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

      {/* Catalog grid inside admin panel */}
      <div className="overflow-x-auto border border-[#EEEEEE] bg-white rounded-none shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF9F6] border-b border-[#EEEEEE] text-[10px] font-bold uppercase tracking-wider text-[#717171]">
              <th className="py-4 px-6">Product</th>
              <th className="py-4 px-6">Category</th>
              <th className="py-4 px-6">Price</th>
              <th className="py-4 px-6">Stock</th>
              <th className="py-4 px-6">Variants</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE] text-xs text-[#1A1A1A]">
            {filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#717171] font-semibold">
                  No products found in Firestore matches. Please check search or add new!
                </td>
              </tr>
            ) : (
              filteredInventory.map((p) => (
                <tr key={p.id} className="hover:bg-[#FAF9F6]/50 transition-colors">
                  {/* Product title/image */}
                  <td className="py-4 px-6 flex items-center space-x-3">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-11 w-11 object-cover bg-[#F5F5F5] border border-[#EEEEEE]"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    <div>
                      <h4 className="font-bold text-black uppercase tracking-wide truncate max-w-[180px]">{p.name}</h4>
                      <span className="font-mono text-[9px] text-[#919191]">{p.id}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-4 px-6">
                    <span className="inline-block px-2 py-0.5 bg-[#F5F5F5] border border-[#EEEEEE] text-[9px] font-bold uppercase tracking-wider text-black">
                      {p.category}
                    </span>
                    {p.subcategory && <span className="block text-[10px] text-[#717171] mt-0.5">{p.subcategory}</span>}
                  </td>

                  {/* Price */}
                  <td className="py-4 px-6 font-mono font-bold text-black">
                    {formatCurrency(p.price)}
                    {p.originalPrice && (
                      <span className="block text-[9px] text-[#919191] line-through font-normal">{formatCurrency(p.originalPrice)}</span>
                    )}
                  </td>

                  {/* Stock (per size, sourced from the linked Parent Product) */}
                  <td className="py-4 px-6">
                    {(() => {
                      const pp = parentProducts.find((x) => x.id === p.parentProductId);
                      if (!pp) {
                        return (
                          <span className="font-mono font-bold px-2 py-0.5 border bg-red-50 text-red-800 border-red-200">
                            No Parent Product
                          </span>
                        );
                      }
                      return (
                        <div className="flex flex-wrap gap-1">
                          {pp.sizeOrder.map((sz) => {
                            const stock = pp.stockBySize[sz] ?? 0;
                            return (
                              <span
                                key={sz}
                                className={`font-mono font-bold px-1.5 py-0.5 border text-[10px] ${
                                  stock === 0
                                    ? 'bg-red-50 text-red-800 border-red-200'
                                    : stock < 10
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                {sz}:{stock}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </td>

                  {/* Variants & Sizes list summaries */}
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      {(() => {
                        const pp = parentProducts.find((x) => x.id === p.parentProductId);
                        return (
                          pp &&
                          pp.sizeOrder.length > 0 && (
                            <span className="block text-[10px] text-[#717171]">
                              <strong className="text-black uppercase text-[9px]">Sizes:</strong> {pp.sizeOrder.join(', ')}
                            </span>
                          )
                        );
                      })()}
                      {p.variants && p.variants.length > 0 && (
                        <span className="block text-[10px] text-[#717171]">
                          <strong className="text-black uppercase text-[9px]">Design Colors:</strong> {p.variants.length} options
                        </span>
                      )}
                      {!parentProducts.find((x) => x.id === p.parentProductId) &&
                        (!p.variants || p.variants.length === 0) && (
                          <span className="text-[10px] italic text-[#919191]">Standard</span>
                        )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEditProduct(p)}
                      className="inline-flex items-center space-x-1 border border-[#EEEEEE] bg-white hover:border-black p-2 text-black transition-colors"
                      title="Edit Product"
                      id={`admin-edit-prod-btn-${p.id}`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="inline-flex items-center space-x-1 border border-red-200 bg-white hover:bg-red-50 p-2 text-red-600 transition-colors"
                      title="Delete Product"
                      id={`admin-delete-prod-btn-${p.id}`}
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

      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => {
          setIsCropperOpen(false);
          setCropperTarget(null);
        }}
        onCropComplete={handleCropComplete}
        title={cropperTarget === 'primary' ? 'Crop & Optimize Primary Image' : 'Crop & Optimize Variant Image'}
      />
    </div>
  );
}
