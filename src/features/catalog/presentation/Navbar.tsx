'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, History, LogIn, LogOut, Loader2, Sliders } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/features/auth/presentation/AuthProvider';
import { useCart } from '@/features/cart/presentation/CartProvider';

export default function Navbar() {
  const { user, authLoading, isAdmin, signIn, signOut } = useAuth();
  const { count: cartCount, openCart } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const currentTab: 'shop' | 'orders' | 'admin' =
    pathname.startsWith('/admin') ? 'admin' : pathname.startsWith('/orders') ? 'orders' : 'shop';
  const setTab = (tab: 'shop' | 'orders' | 'admin') =>
    router.push(tab === 'shop' ? '/' : tab === 'orders' ? '/orders' : '/admin');
  const onOpenCart = openCart;
  const onSignIn = signIn;
  const onSignOut = signOut;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#EEEEEE] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <div
            onClick={() => setTab('shop')}
            className="flex cursor-pointer items-center space-x-3 text-[#1A1A1A]"
            id="brand-logo-trigger"
          >
            <div className="flex h-10 w-10 items-center justify-center border border-[#EEEEEE] rounded-full text-black">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="font-sans text-lg font-bold tracking-tighter uppercase text-black">SwiftCart</h1>
              <span className="hidden text-[9px] font-bold uppercase tracking-[0.2em] text-[#717171] sm:block">
                Premium Hardware
              </span>
            </div>
          </div>

          {/* Navigation Tabs (desktop/tablet only — mobile uses the bottom nav bar) */}
          <nav className="hidden sm:flex items-center space-x-1 sm:space-x-4">
            <button
              id="tab-shop-btn"
              onClick={() => setTab('shop')}
              className={`relative px-3 py-2 text-[12px] font-semibold uppercase tracking-wider transition-colors ${
                currentTab === 'shop' ? 'text-black' : 'text-[#717171] hover:text-black'
              }`}
            >
              Shop All
              {currentTab === 'shop' && (
                <motion.div layoutId="active-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
            <button
              id="tab-orders-btn"
              onClick={() => setTab('orders')}
              className={`relative px-3 py-2 text-[12px] font-semibold uppercase tracking-wider transition-colors ${
                currentTab === 'orders' ? 'text-black' : 'text-[#717171] hover:text-black'
              }`}
            >
              <div className="flex items-center space-x-1">
                <History className="h-3.5 w-3.5" />
                <span>Track Order</span>
              </div>
              {currentTab === 'orders' && (
                <motion.div layoutId="active-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
            {isAdmin && (
              <button
                id="tab-admin-btn"
                onClick={() => setTab('admin')}
                className={`relative px-3 py-2 text-[12px] font-semibold uppercase tracking-wider transition-colors ${
                  currentTab === 'admin' ? 'text-black' : 'text-[#717171] hover:text-black'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Merchant Hub</span>
                </div>
                {currentTab === 'admin' && (
                  <motion.div layoutId="active-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
            )}
          </nav>

          {/* Right side controls */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Cart Icon (desktop/tablet only — mobile uses the bottom nav bar) */}
            <button
              id="navbar-cart-toggle"
              onClick={onOpenCart}
              className="relative hidden sm:flex h-10 w-10 items-center justify-center border border-[#EEEEEE] rounded-full text-[#1A1A1A] hover:bg-[#F5F5F5]"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={cartCount}
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>

            {/* Auth Button */}
            {authLoading ? (
              <div className="flex h-10 w-10 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-[#717171]" />
              </div>
            ) : user ? (
              <div className="flex items-center space-x-2.5">
                <img
                  src={user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt={user.displayName || 'Profile'}
                  className="h-8 w-8 rounded-full border border-[#EEEEEE]"
                  referrerPolicy="no-referrer"
                />
                <button
                  id="sign-out-btn"
                  onClick={onSignOut}
                  className="hidden items-center space-x-1.5 border border-[#EEEEEE] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#717171] hover:bg-[#F5F5F5] hover:text-black sm:flex"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                id="sign-in-btn"
                onClick={onSignIn}
                className="flex items-center space-x-1.5 border border-black bg-black px-4.5 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#333333]"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (icon + label, mirrors the desktop tabs) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-[#EEEEEE] bg-white/95 backdrop-blur-md sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        id="mobile-bottom-nav"
      >
        <button
          id="mobile-tab-shop-btn"
          onClick={() => setTab('shop')}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            currentTab === 'shop' ? 'text-black' : 'text-[#919191]'
          }`}
        >
          <ShoppingBag className="h-5 w-5" />
          <span>Shop All</span>
        </button>
        <button
          id="mobile-tab-orders-btn"
          onClick={() => setTab('orders')}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            currentTab === 'orders' ? 'text-black' : 'text-[#919191]'
          }`}
        >
          <History className="h-5 w-5" />
          <span>Track Order</span>
        </button>
        {isAdmin && (
          <button
            id="mobile-tab-admin-btn"
            onClick={() => setTab('admin')}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              currentTab === 'admin' ? 'text-black' : 'text-[#919191]'
            }`}
          >
            <Sliders className="h-5 w-5" />
            <span>Merchant Hub</span>
          </button>
        )}
        <button
          id="mobile-tab-cart-btn"
          onClick={onOpenCart}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#919191] transition-colors"
        >
          <span className="relative">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[8px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </span>
          <span>Cart</span>
        </button>
      </nav>
    </>
  );
}
