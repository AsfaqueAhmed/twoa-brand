import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  serverTimestamp,
  orderBy,
  arrayUnion
} from 'firebase/firestore';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  ShoppingBag, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  Truck, 
  Package, 
  XCircle,
  Search,
  Check,
  Tag,
  Sliders,
  DollarSign,
  Layers,
  Sparkles,
  Upload
} from 'lucide-react';
import { Product, ProductVariant, Order, OrderStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import ImageCropperModal from './ImageCropperModal';

interface AdminPanelProps {
  user: any;
  products: Product[];
  onRefreshProducts: () => Promise<void>;
}

export default function AdminPanel({ user, products, onRefreshProducts }: AdminPanelProps) {
  // Navigation inside Admin Panel
  const [adminSubTab, setAdminSubTab] = useState<'inventory' | 'orders'>('inventory');

  // Orders State
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');

  // Product Editor State
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editorError, setEditorError] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Temp arrays for sizes and variants
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>(['S', 'M', 'L', 'XL']);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);

  // Categories collection (persisted independently in Firestore, so category/
  // subcategory names survive even if no product currently uses them)
  const [categoryDocs, setCategoryDocs] = useState<{ id: string; name: string; subcategories: string[] }[]>([]);

  const categorySlug = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const fetchCategories = async () => {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      const fetched: { id: string; name: string; subcategories: string[] }[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({ id: docSnap.id, name: data.name || docSnap.id, subcategories: data.subcategories || [] });
      });
      setCategoryDocs(fetched);
    } catch (err) {
      console.error('Error fetching categories: ', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const persistNewCategory = async (name: string) => {
    const id = categorySlug(name);
    if (!id) return;
    try {
      await setDoc(doc(db, 'categories', id), { name, subcategories: [] }, { merge: true });
      setCategoryDocs(prev => prev.some(c => c.id === id) ? prev : [...prev, { id, name, subcategories: [] }]);
    } catch (err) {
      console.error('Error saving category: ', err);
    }
  };

  const persistNewSubcategory = async (categoryName: string, subName: string) => {
    const id = categorySlug(categoryName);
    if (!id) return;
    try {
      await setDoc(doc(db, 'categories', id), { name: categoryName, subcategories: arrayUnion(subName) }, { merge: true });
      setCategoryDocs(prev => {
        const existing = prev.find(c => c.id === id);
        if (existing) {
          return prev.map(c => c.id === id ? { ...c, subcategories: Array.from(new Set([...c.subcategories, subName])) } : c);
        }
        return [...prev, { id, name: categoryName, subcategories: [subName] }];
      });
    } catch (err) {
      console.error('Error saving subcategory: ', err);
    }
  };

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
      stock: editingProduct.stock,
      sizes: selectedSizes,
      variants: productVariants,
    };
    return new TextEncoder().encode(JSON.stringify(payload)).length;
  };

  // Fetch all orders from Firestore
  const fetchAllOrders = async () => {
    setOrdersLoading(true);
    try {
      const q = query(collection(db, 'orders'));
      const querySnapshot = await getDocs(q);
      const fetchedOrders: Order[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        const createdAtISO = data.createdAt?.toDate 
          ? data.createdAt.toDate().toISOString() 
          : (data.createdAt || new Date().toISOString());
        const updatedAtISO = data.updatedAt?.toDate 
          ? data.updatedAt.toDate().toISOString() 
          : (data.updatedAt || new Date().toISOString());

        fetchedOrders.push({
          id: docSnap.id,
          userId: data.userId || '',
          userName: data.userName || '',
          userEmail: data.userEmail || '',
          address: data.address || '',
          phone: data.phone || '',
          items: data.items || [],
          totalAmount: Number(data.totalAmount) || 0,
          status: data.status || 'pending',
          paymentMethod: data.paymentMethod || 'cash_on_delivery',
          promoCode: data.promoCode,
          discount: data.discount,
          createdAt: createdAtISO,
          updatedAt: updatedAtISO,
        });
      });

      // Sort newest first in-memory
      fetchedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllOrders(fetchedOrders);
    } catch (err) {
      console.error("Error fetching all orders: ", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (adminSubTab === 'orders') {
      fetchAllOrders();
    }
  }, [adminSubTab]);

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
      stock: 10,
    });
    setSelectedSizes([]);
    setAvailableSizes(['S', 'M', 'L', 'XL']);
    setCustomSizeInput('');
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
    setSelectedSizes(p.sizes || []);
    const defaultSizes = ['S', 'M', 'L', 'XL'];
    const mergedSizes = Array.from(new Set([...defaultSizes, ...(p.sizes || [])]));
    setAvailableSizes(mergedSizes);
    setCustomSizeInput('');
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
    setEditingProduct(prev => prev ? { ...prev, category: trimmed } : null);
    setIsAddingNewCategory(false);
    setNewCategoryInput('');
    await persistNewCategory(trimmed);
  };

  const handleConfirmNewSubcategory = async () => {
    const trimmed = newSubcategoryInput.trim();
    if (!trimmed || !editingProduct?.category) return;
    setEditingProduct(prev => prev ? { ...prev, subcategory: trimmed } : null);
    setIsAddingNewSubcategory(false);
    setNewSubcategoryInput('');
    await persistNewSubcategory(editingProduct.category, trimmed);
  };

  const handleAddCustomSize = () => {
    const trimmed = customSizeInput.trim().toUpperCase();
    if (!trimmed) return;
    if (!availableSizes.includes(trimmed)) {
      setAvailableSizes(prev => [...prev, trimmed]);
    }
    if (!selectedSizes.includes(trimmed)) {
      setSelectedSizes(prev => [...prev, trimmed]);
    }
    setCustomSizeInput('');
  };

  const handleTriggerCrop = (target: 'primary' | 'variant') => {
    if (estimateDocSizeBytes() / MAX_DOC_BYTES >= UPLOAD_BLOCK_RATIO) {
      setEditorError('Document size has reached 90% of the Firestore 1 MiB limit. Remove an image or paste an external URL instead of uploading another.');
      return;
    }
    setCropperTarget(target);
    setIsCropperOpen(true);
  };

  const handleCropComplete = (compressedDataUrl: string) => {
    if (cropperTarget === 'primary') {
      setEditingProduct(prev => prev ? { ...prev, image: compressedDataUrl } : null);
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
      image: imageUrl
    };
    setProductVariants(prev => [...prev, newVariant]);
    setNewVariantName('');
    setNewVariantColor('#000000');
    setNewVariantImage('');
    setEditorError('');
  };

  const handleRemoveVariant = (varId: string) => {
    setProductVariants(prev => prev.filter(v => v.id !== varId));
  };

  const toggleSizeSelection = (sz: string) => {
    setSelectedSizes(prev => 
      prev.includes(sz) ? prev.filter(item => item !== sz) : [...prev, sz]
    );
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const { id, name, description, price, image, category, subcategory, stock } = editingProduct;

    if (!id || !name || !description || price === undefined || !image || !category) {
      setEditorError('Please fill in all required fields (ID, Name, Description, Price, Primary Image, Category).');
      return;
    }

    if (price <= 0 || stock === undefined || stock < 0) {
      setEditorError('Price must be greater than 0, and stock must be 0 or more.');
      return;
    }

    setIsSavingProduct(true);
    setEditorError('');

    try {
      const docRef = doc(db, 'products', id);
      const payload = {
        id,
        name,
        description,
        price: Number(price),
        originalPrice: editingProduct.originalPrice ? Number(editingProduct.originalPrice) : null,
        image,
        category,
        subcategory: subcategory || '',
        rating: editingProduct.rating || 5,
        stock: Number(stock),
        sizes: selectedSizes,
        variants: productVariants,
      };

      await setDoc(docRef, payload);
      await onRefreshProducts();
      setIsEditingProduct(false);
      setEditingProduct(null);
    } catch (err: any) {
      console.error("Error saving product: ", err);
      setEditorError(err.message || 'Failed to save product in Firestore.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm('Are you sure you want to delete this product from your Firestore Catalog?')) return;
    try {
      await deleteDoc(doc(db, 'products', prodId));
      await onRefreshProducts();
    } catch (err) {
      console.error("Error deleting product: ", err);
      alert('Failed to delete product.');
    }
  };

  // Order status update handler
  const handleAdminUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      // Refresh list
      await fetchAllOrders();
    } catch (err) {
      console.error("Error updating order status: ", err);
      alert('Failed to update status.');
    }
  };

  // Categories: sourced from the persisted `categories` collection, merged with any
  // legacy category names still only present on existing product docs.
  const existingCategories = Array.from(new Set([
    ...categoryDocs.map(c => c.name),
    ...products.map(p => p.category).filter(Boolean),
  ])).sort();

  // Subcategories for the currently selected category, same merge strategy.
  const existingSubcategories = Array.from(new Set([
    ...(categoryDocs.find(c => c.name === editingProduct?.category)?.subcategories || []),
    ...products
      .filter(p => !editingProduct?.category || p.category === editingProduct.category)
      .map(p => p.subcategory)
      .filter((s): s is string => !!s),
  ])).sort();

  // Live Firestore document size estimate for the product currently being edited
  const currentDocBytes = estimateDocSizeBytes();
  const currentDocPercent = (currentDocBytes / MAX_DOC_BYTES) * 100;
  const isUploadBlocked = currentDocPercent >= UPLOAD_BLOCK_RATIO * 100;

  // Search/Filters logic
  const [productSearch, setProductSearch] = useState('');
  const filteredInventory = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.id.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredOrders = allOrders.filter(o => {
    const matchesSearch = o.userName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                          o.userEmail.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                          o.phone.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                          o.id.toLowerCase().includes(orderSearchQuery.toLowerCase());
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'out_for_delivery': return <Truck className="h-4 w-4 text-indigo-500" />;
      case 'delivered': return <Package className="h-4 w-4 text-emerald-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'confirmed': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'out_for_delivery': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'delivered': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-50 text-red-800 border-red-200';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8" id="admin-panel-container">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#EEEEEE] pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-sans text-2xl font-bold uppercase tracking-tight text-[#1A1A1A]">
              Merchant Control Hub
            </h1>
            <span className="bg-black text-white text-[9px] uppercase tracking-widest font-bold px-2 py-0.5">
              Live Demo Access
            </span>
          </div>
          <p className="text-xs text-[#717171] mt-1.5 max-w-2xl leading-relaxed">
            All database operations are actively synced to <span className="font-semibold text-black">Firebase Firestore</span>.
            Update active merchant stock levels, add design/color variations, and oversee customer deliveries globally.
          </p>
        </div>

        {/* Dashboard sub-navigation tabs */}
        <div className="flex bg-[#F5F5F5] p-1 border border-[#EEEEEE] rounded-none">
          <button
            onClick={() => setAdminSubTab('inventory')}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-none ${
              adminSubTab === 'inventory'
                ? 'bg-white text-black shadow-xs border border-transparent'
                : 'text-[#717171] hover:text-black'
            }`}
            id="admin-inventory-tab-btn"
          >
            Inventory Management
          </button>
          <button
            onClick={() => setAdminSubTab('orders')}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-none ${
              adminSubTab === 'orders'
                ? 'bg-white text-black shadow-xs border border-transparent'
                : 'text-[#717171] hover:text-black'
            }`}
            id="admin-orders-tab-btn"
          >
            All Orders Panel
          </button>
        </div>
      </div>

      {/* --- INVENTORY TAB --- */}
      {adminSubTab === 'inventory' && (
        <div className="space-y-6 animate-in fade-in duration-200">
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
                      {editingProduct.id && products.find(p => p.id === editingProduct.id) ? 'Edit Catalog Product' : 'Add New Catalog Product'}
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
                  <div className={`border p-4 mb-6 ${isUploadBlocked ? 'bg-red-50 border-red-200' : 'bg-[#FAF9F6] border-[#EEEEEE]'}`} id="doc-size-monitor">
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
                        90% of the Firestore 1 MiB per-document limit reached. New image uploads are disabled — remove an image or use an external URL instead.
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
                          onChange={(e) => setEditingProduct(prev => ({ ...prev, id: e.target.value }))}
                          disabled={!!products.find(p => p.id === editingProduct.id)}
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
                          onChange={(e) => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Classic Linen Overshirt"
                          className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                          onChange={(e) => setEditingProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
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
                          onChange={(e) => setEditingProduct(prev => ({ ...prev, originalPrice: parseFloat(e.target.value) || undefined }))}
                          placeholder="e.g. 60.00"
                          className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                        />
                      </div>

                      {/* Stock */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5">
                          Stock Units*
                        </label>
                        <input
                          type="number"
                          required
                          value={editingProduct.stock === undefined ? '' : editingProduct.stock}
                          onChange={(e) => setEditingProduct(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                          placeholder="e.g. 50"
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
                                setEditingProduct(prev => ({ ...prev, category: e.target.value }));
                              }
                            }}
                            className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                          >
                            <option value="" disabled>Select a category…</option>
                            {Array.from(new Set([
                              ...existingCategories,
                              ...(editingProduct.category ? [editingProduct.category] : [])
                            ])).sort().map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
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
                              onClick={() => { setIsAddingNewCategory(false); setNewCategoryInput(''); }}
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
                                setEditingProduct(prev => ({ ...prev, subcategory: e.target.value }));
                              }
                            }}
                            className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                          >
                            <option value="">None</option>
                            {Array.from(new Set([
                              ...existingSubcategories,
                              ...(editingProduct.subcategory ? [editingProduct.subcategory] : [])
                            ])).sort().map(sub => (
                              <option key={sub} value={sub}>{sub}</option>
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
                              onClick={() => { setIsAddingNewSubcategory(false); setNewSubcategoryInput(''); }}
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
                            onChange={(e) => setEditingProduct(prev => ({ ...prev, image: e.target.value }))}
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
                            onClick={() => setEditingProduct(prev => prev ? { ...prev, image: '' } : null)}
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
                        onChange={(e) => setEditingProduct(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Write dynamic sales copy or specs..."
                        className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 px-3.5 text-xs text-black focus:border-black focus:outline-none"
                      />
                    </div>

                    {/* Sizes Selection (Checkboxes) */}
                    <div className="border-t border-[#EEEEEE] pt-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#717171]">
                          Size Variations (Check to Enable)
                        </span>
                        
                        {/* Custom Size Addition Form */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={customSizeInput}
                            onChange={(e) => setCustomSizeInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomSize();
                              }
                            }}
                            placeholder="Add custom size (e.g. XXL, 42, 9.5)"
                            className="rounded-none border border-[#EEEEEE] bg-white py-1.5 px-2.5 text-[11px] font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none w-48"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomSize}
                            className="bg-black hover:bg-[#333333] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2 transition-colors shrink-0"
                          >
                            Add Size
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        {availableSizes.map(sz => {
                          const isSel = selectedSizes.includes(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => toggleSizeSelection(sz)}
                              className={`h-10 px-4 text-xs font-bold font-mono flex items-center justify-center border transition-all duration-150 ${
                                isSel 
                                  ? 'bg-black text-white border-black'
                                  : 'bg-white text-black border-[#EEEEEE] hover:border-black'
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
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
                        {p.subcategory && (
                          <span className="block text-[10px] text-[#717171] mt-0.5">{p.subcategory}</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="py-4 px-6 font-mono font-bold text-black">
                        ${p.price.toFixed(2)}
                        {p.originalPrice && (
                          <span className="block text-[9px] text-[#919191] line-through font-normal">${p.originalPrice.toFixed(2)}</span>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="py-4 px-6">
                        <span className={`font-mono font-bold px-2 py-0.5 border ${
                          p.stock === 0 
                            ? 'bg-red-50 text-red-800 border-red-200' 
                            : p.stock < 10 
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {p.stock} units
                        </span>
                      </td>

                      {/* Variants & Sizes list summaries */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          {p.sizes && p.sizes.length > 0 && (
                            <span className="block text-[10px] text-[#717171]">
                              <strong className="text-black uppercase text-[9px]">Sizes:</strong> {p.sizes.join(', ')}
                            </span>
                          )}
                          {p.variants && p.variants.length > 0 && (
                            <span className="block text-[10px] text-[#717171]">
                              <strong className="text-black uppercase text-[9px]">Design Colors:</strong> {p.variants.length} options
                            </span>
                          )}
                          {(!p.sizes || p.sizes.length === 0) && (!p.variants || p.variants.length === 0) && (
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
        </div>
      )}

      {/* --- ALL ORDERS TAB --- */}
      {adminSubTab === 'orders' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Filtering and Sorting controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#FAF9F6] border border-[#EEEEEE] p-5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute top-3 left-3.5 h-4 w-4 text-[#717171]" />
              <input
                type="text"
                placeholder="Search by customer name, phone, email or ID..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="w-full rounded-none border border-[#EEEEEE] bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none transition-colors"
                id="admin-order-search"
              />
            </div>

            {/* Status Tabs selector */}
            <div className="flex bg-[#F5F5F5] p-1 border border-[#EEEEEE] rounded-none justify-between col-span-1 md:col-span-2">
              {(['all', 'pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all rounded-none ${
                    orderStatusFilter === st
                      ? 'bg-white text-black shadow-xs'
                      : 'text-[#717171] hover:text-black'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Orders detail list */}
          {ordersLoading ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#EEEEEE]">
              <RefreshCw className="h-6 w-6 text-black animate-spin mb-4" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#717171]">Synchronizing orders list...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-none border border-[#EEEEEE] p-12 text-center bg-white">
              <ShoppingBag className="mx-auto h-8 w-8 text-[#717171] mb-3" />
              <h3 className="text-sm font-bold uppercase text-black">No Customer Orders Available</h3>
              <p className="mt-2 text-xs text-[#717171] leading-relaxed max-w-xs mx-auto">
                No customer has placed orders matching this filter, or the system orders database is empty.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((ord) => (
                <div 
                  key={ord.id}
                  className="bg-white border border-[#EEEEEE] rounded-none p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6"
                  id={`admin-order-row-${ord.id}`}
                >
                  {/* Order Main Details & Customer Data */}
                  <div className="space-y-4 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-black uppercase tracking-tight">
                        Order #{ord.id}
                      </span>
                      <span className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest border ${getStatusStyle(ord.status)}`}>
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-[#919191] font-mono">
                        {new Date(ord.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Customer Identity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs leading-relaxed">
                      <div>
                        <span className="text-[#717171] block font-medium">Customer Information:</span>
                        <p className="text-black font-bold uppercase tracking-wide mt-0.5">{ord.userName}</p>
                        <p className="text-[#717171] font-mono">{ord.userEmail}</p>
                        <p className="text-[#111111] font-mono font-bold mt-0.5">Phone: {ord.phone}</p>
                      </div>
                      <div>
                        <span className="text-[#717171] block font-medium">Delivery Address (Cash on Delivery):</span>
                        <p className="text-black font-semibold mt-0.5 leading-relaxed">{ord.address}</p>
                      </div>
                    </div>

                    {/* Ordered Items summary breakdown */}
                    <div className="border-t border-[#F5F5F5] pt-4.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#717171]">Order Details:</span>
                      <div className="mt-2 divide-y divide-[#F5F5F5] bg-[#FAF9F6] border border-[#EEEEEE] p-4 space-y-1 max-h-[140px] overflow-y-auto">
                        {ord.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs py-1.5 first:pt-0 last:pb-0">
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-7 w-7 object-cover bg-[#F5F5F5] border border-[#EEEEEE] shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <span className="font-bold text-black truncate block max-w-[200px] uppercase tracking-wide">
                                  {item.name} <span className="text-[#717171] font-normal">× {item.quantity}</span>
                                </span>
                                
                                {/* Badges */}
                                <div className="flex gap-1 mt-0.5">
                                  {item.selectedVariant && (
                                    <span className="inline-flex items-center gap-1 text-[8px] font-bold text-black uppercase font-mono tracking-wider bg-white px-1 border border-[#EEEEEE]">
                                      {item.selectedVariant.name}
                                    </span>
                                  )}
                                  {item.selectedSize && (
                                    <span className="text-[8px] font-bold text-black uppercase font-mono tracking-wider bg-white px-1 border border-[#EEEEEE]">
                                      Size: {item.selectedSize}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-black">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Delivery Total and Shipping controls */}
                  <div className="flex flex-col md:items-end justify-between self-stretch shrink-0 gap-4">
                    <div className="text-right">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#717171]">Total Delivery Amount</span>
                      <p className="text-2xl font-bold text-black font-mono mt-1">${ord.totalAmount.toFixed(2)}</p>
                      <span className="inline-block mt-1 bg-black text-white px-2 py-0.5 text-[8px] uppercase tracking-wider font-bold">
                        Pay on Delivery
                      </span>
                    </div>

                    {/* Merchant actions dropdown status updates */}
                    <div className="border border-[#EEEEEE] bg-[#FAF9F6] p-3.5 space-y-2">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-black">
                        Update Shipping Status:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'] as OrderStatus[]).map((statusVal) => {
                          const isCurrent = ord.status === statusVal;
                          return (
                            <button
                              key={statusVal}
                              onClick={() => handleAdminUpdateOrderStatus(ord.id, statusVal)}
                              className={`px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all border ${
                                isCurrent
                                  ? 'bg-black text-white border-black'
                                  : 'bg-white text-[#717171] border-[#EEEEEE] hover:border-black hover:text-black'
                              }`}
                            >
                              {statusVal.replace(/_/g, ' ')}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
      )}
    </div>
  );
}
