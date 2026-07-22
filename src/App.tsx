import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, setDoc, updateDoc, doc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Search, Filter, Sparkles, ShoppingBag, ArrowRight, ShieldCheck, HelpCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

import { auth, db, handleFirestoreError, OperationType, ADMIN_EMAIL } from './firebase';
import { Product, CartItem, Order, OrderStatus, OrderItem, ProductVariant } from './types';

// Components
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';
import CheckoutView from './components/CheckoutView';
import OrderTrackingView from './components/OrderTrackingView';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setTab] = useState<'shop' | 'orders' | 'admin'>('shop');
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Dynamic Products state from Firestore
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Fetch products from Firestore with auto-seeding if collection is empty
  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const q = query(collection(db, 'products'));
      const querySnapshot = await getDocs(q);
      const fetchedProducts: Product[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedProducts.push({
          id: docSnap.id,
          name: data.name || '',
          description: data.description || '',
          price: Number(data.price) || 0,
          originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
          image: data.image || '',
          category: data.category || '',
          subcategory: data.subcategory || '',
          rating: Number(data.rating) || 5,
          stock: Number(data.stock) || 0,
          sizes: data.sizes || [],
          variants: data.variants || [],
        });
      });

      setProducts(fetchedProducts);
    } catch (err) {
      console.error("Error fetching products: ", err);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (currentTab === 'admin' && !isAdmin) {
      setTab('shop');
    }
  }, [isAdmin, currentTab]);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('swiftcart_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Search & Catalog Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');

  // Sync cart to local storage
  useEffect(() => {
    localStorage.setItem('swiftcart_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Firebase connection test and Authentication state listener
  useEffect(() => {
    // 1. Mandatory connection check
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    // 2. Auth listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch orders whenever user is available
  const fetchOrders = async () => {
    if (!user) {
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    const path = 'orders';
    try {
      const q = query(collection(db, path), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedOrders: Order[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        // Convert serverTimestamp to ISO string safely for rendering
        const createdAtISO = data.createdAt?.toDate 
          ? data.createdAt.toDate().toISOString() 
          : (data.createdAt || new Date().toISOString());
        const updatedAtISO = data.updatedAt?.toDate 
          ? data.updatedAt.toDate().toISOString() 
          : (data.updatedAt || new Date().toISOString());

        fetchedOrders.push({
          id: docSnap.id,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          address: data.address,
          phone: data.phone,
          items: data.items,
          totalAmount: data.totalAmount,
          status: data.status,
          paymentMethod: data.paymentMethod,
          createdAt: createdAtISO,
          updatedAt: updatedAtISO,
        });
      });

      // Sort in-memory to prevent requiring compound indexing issues
      fetchedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(fetchedOrders);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setOrders([]);
    }
  }, [user]);

  // Auth procedures
  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Sign in failed: ', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setTab('shop');
    } catch (err) {
      console.error('Sign out failed: ', err);
    }
  };

  // Cart operations
  const handleAddToCart = (product: Product, quantity: number = 1, selectedSize?: string, selectedVariant?: ProductVariant) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (item) =>
          item.product.id === product.id &&
          item.selectedSize === selectedSize &&
          item.selectedVariant?.id === selectedVariant?.id
      );
      if (existing) {
        const newQty = Math.min(product.stock, existing.quantity + quantity);
        return prev.map((item) =>
          (item.product.id === product.id &&
            item.selectedSize === selectedSize &&
            item.selectedVariant?.id === selectedVariant?.id)
            ? { ...item, quantity: newQty }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: Math.min(product.stock, quantity),
          selectedSize,
          selectedVariant,
        },
      ];
    });
  };

  const handleUpdateCartQuantity = (
    productId: string,
    quantity: number,
    selectedSize?: string,
    selectedVariant?: ProductVariant
  ) => {
    if (quantity <= 0) {
      handleRemoveCartItem(productId, selectedSize, selectedVariant);
      return;
    }
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCartItems((prev) =>
      prev.map((item) =>
        (item.product.id === productId &&
          item.selectedSize === selectedSize &&
          item.selectedVariant?.id === selectedVariant?.id)
          ? { ...item, quantity: Math.min(product.stock, quantity) }
          : item
      )
    );
  };

  const handleRemoveCartItem = (
    productId: string,
    selectedSize?: string,
    selectedVariant?: ProductVariant
  ) => {
    setCartItems((prev) =>
      prev.filter(
        (item) =>
          !(item.product.id === productId &&
            item.selectedSize === selectedSize &&
            item.selectedVariant?.id === selectedVariant?.id)
      )
    );
  };

  // Checkout trigger
  const handleProceedToCheckout = () => {
    if (!user) {
      handleSignIn();
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutMode(true);
  };

  // Place Order submission
  const handlePlaceOrder = async (deliveryDetails: { 
    name: string; 
    phone: string; 
    address: string;
    promoCode?: string;
    discount?: number;
    finalTotal?: number;
  }) => {
    if (!user) return;
    setIsPlacingOrder(true);
    const path = 'orders';

    // Generate clean alphanumeric ID starting with ord_
    const randomHex = Array.from({ length: 12 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const orderId = `ord_${randomHex}`;

    const orderItemsPayload: OrderItem[] = cartItems.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.image,
      selectedSize: item.selectedSize || undefined,
      selectedVariant: item.selectedVariant || undefined,
    }));

    const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const deliveryFee = subtotal > 100 ? 0 : 4.99;
    const computedTotal = Math.round((subtotal + deliveryFee) * 100) / 100;
    const finalTotal = deliveryDetails.finalTotal !== undefined ? deliveryDetails.finalTotal : computedTotal;

    const newOrderPayload: any = {
      id: orderId,
      userId: user.uid,
      userName: deliveryDetails.name,
      userEmail: user.email || '',
      address: deliveryDetails.address,
      phone: deliveryDetails.phone,
      items: orderItemsPayload,
      totalAmount: finalTotal,
      status: 'pending' as OrderStatus,
      paymentMethod: 'cash_on_delivery' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (deliveryDetails.promoCode) {
      newOrderPayload.promoCode = deliveryDetails.promoCode;
    }
    if (deliveryDetails.discount !== undefined) {
      newOrderPayload.discount = deliveryDetails.discount;
    }

    try {
      await setDoc(doc(db, path, orderId), newOrderPayload);
      
      // Update dynamic product stock levels in Firestore
      for (const item of cartItems) {
        const currentProd = products.find(p => p.id === item.product.id);
        if (currentProd) {
          const prodRef = doc(db, 'products', item.product.id);
          const nextStock = Math.max(0, currentProd.stock - item.quantity);
          await updateDoc(prodRef, {
            stock: nextStock
          });
        }
      }
      await fetchProducts();

      // Success: Reset states and route to tracking
      setCartItems([]);
      setIsCheckoutMode(false);
      setTab('orders');
      await fetchOrders();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${path}/${orderId}`);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Admin simulation state modification
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    const path = `orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      await fetchOrders();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  // Cancel order customer request
  const handleCancelOrder = async (orderId: string) => {
    await handleUpdateOrderStatus(orderId, 'cancelled');
  };

  // Filter products catalog
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSubcategory = selectedSubcategory === 'All' || product.subcategory === selectedSubcategory;
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  // Unique list of categories dynamically gathered
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  // Subcategories of selected category dynamically gathered
  const subcategories = selectedCategory === 'All'
    ? []
    : ['All', ...Array.from(new Set(products
        .filter((p) => p.category === selectedCategory)
        .map((p) => p.subcategory)
        .filter((sub): sub is string => !!sub)
      ))];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-black selection:text-white">
      {/* Header / Navbar */}
      <Navbar
        user={user}
        authLoading={authLoading}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        currentTab={currentTab}
        isAdmin={isAdmin}
        setTab={(t) => {
          setTab(t);
          setIsCheckoutMode(false);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 w-full pb-24 sm:pb-16">
        {/* If in check-out view */}
        {isCheckoutMode ? (
          <CheckoutView
            user={user}
            cartItems={cartItems}
            onBack={() => setIsCheckoutMode(false)}
            onPlaceOrder={handlePlaceOrder}
            isPlacing={isPlacingOrder}
          />
        ) : currentTab === 'shop' ? (
          /* --- SHOP TAB --- */
          productsLoading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <Loader2 className="h-8 w-8 text-black animate-spin mb-4" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#717171]">Synchronizing products with Firestore...</span>
            </div>
          ) : (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8" id="shop-catalog-section">
              {/* Hero Promotion Panel */}
              <div className="relative overflow-hidden rounded-none bg-black text-white p-8 sm:p-12 mb-10 border border-black">
                <div className="relative z-10 max-w-xl space-y-4">
                  <span className="inline-flex items-center space-x-1.5 border border-white/20 bg-white/5 text-white text-[9px] font-bold px-3 py-1 uppercase tracking-[0.2em]">
                    <Sparkles className="h-3 w-3" />
                    <span>100% Risk-Free Shopping</span>
                  </span>
                  <h2 className="text-xl sm:text-3xl font-bold uppercase tracking-[0.15em] leading-snug">
                    Premium Quality, Paid on Delivery
                  </h2>
                  <p className="text-xs sm:text-sm text-[#A1A1A1] leading-relaxed">
                    Browse elite, curated productivity and lifestyle hardware accessories. Hand over cash only after successfully receiving and reviewing your package items.
                  </p>
                </div>
              </div>

              {/* Filter controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                {/* Search input */}
                <div className="relative max-w-md w-full">
                  <Search className="absolute top-3.5 left-4 h-4.5 w-4.5 text-[#717171]" />
                  <input
                    type="text"
                    placeholder="Search catalog products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-none border border-[#EEEEEE] bg-white py-3.5 pl-11 pr-4 text-xs font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none transition-colors"
                    id="catalog-search"
                  />
                </div>

                {/* Category tags selector */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-full" id="category-selector">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSelectedSubcategory('All');
                      }}
                      className={`rounded-none px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
                        selectedCategory === cat
                          ? 'bg-black text-white border-black'
                          : 'bg-white border-[#EEEEEE] text-[#717171] hover:border-black hover:text-black'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Subcategory tags filter */}
              {selectedCategory !== 'All' && subcategories.length > 1 && (
                <div 
                  className="flex flex-wrap items-center gap-2 mb-8 bg-[#FAF9F6] p-4 border border-[#EEEEEE] animate-in fade-in duration-200" 
                  id="subcategory-selector"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717171] mr-2">
                    Subcategories:
                  </span>
                  {subcategories.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubcategory(sub)}
                      className={`rounded-none px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border ${
                        selectedSubcategory === sub
                          ? 'bg-black text-white border-black'
                          : 'bg-white border-[#EEEEEE] text-[#717171] hover:border-black hover:text-black'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}

              {/* Products grid */}
              {filteredProducts.length === 0 ? (
                <div className="rounded-none border border-dashed border-[#EEEEEE] p-12 text-center bg-white my-12">
                  <Search className="mx-auto h-8 w-8 text-[#717171]" />
                  <h4 className="mt-3 text-xs font-bold uppercase tracking-wider text-black">No products match your query</h4>
                  <p className="mt-2 text-xs text-[#717171] leading-relaxed">
                    Try adjusting search keywords or clearing department filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6" id="product-grid">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={(p) => setSelectedProduct(p)}
                      onAddToCart={(p, e) => {
                        e.stopPropagation();
                        if ((p.sizes && p.sizes.length > 0) || (p.variants && p.variants.length > 0)) {
                          setSelectedProduct(p);
                        } else {
                          handleAddToCart(p, 1);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        ) : currentTab === 'admin' && isAdmin ? (
          /* --- ADMIN PANEL TAB --- */
          <AdminPanel
            user={user}
            products={products}
            onRefreshProducts={fetchProducts}
          />
        ) : (
          /* --- ORDERS / TRACKING TAB --- */
          <OrderTrackingView
            orders={orders}
            loading={ordersLoading}
            onRefresh={fetchOrders}
            onUpdateStatus={handleUpdateOrderStatus}
            onCancelOrder={handleCancelOrder}
          />
        )}
      </main>

      {/* Slide-out Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={handleProceedToCheckout}
      />

      {/* Product Specification Detail Modal Overlay */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}
