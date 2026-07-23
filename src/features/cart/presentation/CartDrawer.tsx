'use client';

import { X, Trash2, ShoppingBag, ArrowRight, Info } from 'lucide-react';
import type { ProductVariant } from '@/shared/domain/types';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from './CartProvider';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/shared/lib/formatCurrency';

export default function CartDrawer() {
  const { items: cartItems, isOpen, closeCart, updateQuantity, removeFromCart, subtotal } = useCart();
  const router = useRouter();
  const onClose = closeCart;
  const onUpdateQuantity = updateQuantity;
  const onRemoveItem = removeFromCart;
  const onCheckout = () => {
    closeCart();
    router.push('/checkout');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs"
          id="cart-backdrop"
        />

        {/* Slide-out Panel: full-screen "page" on mobile, right-side drawer on desktop */}
        <div className="fixed inset-0 sm:inset-y-0 sm:right-0 flex justify-end max-w-full sm:pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-screen h-full sm:max-w-md bg-white sm:border-l border-[#EEEEEE] flex flex-col"
            id="cart-drawer-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EEEEEE] px-6 h-20">
              <div className="flex items-center space-x-2.5">
                <ShoppingBag className="h-5 w-5 text-black" />
                <h2 className="text-[13px] font-bold uppercase tracking-[0.2em] text-black">Shopping Bag</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-[#EEEEEE] p-2 text-[#717171] hover:bg-[#F5F5F5] hover:text-black transition-colors"
                id="close-cart-btn"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-none border border-[#EEEEEE] bg-[#F5F5F5] text-[#717171] mb-5">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-black">Your bag is empty</h3>
                  <p className="mt-2 text-xs text-[#717171] max-w-xs leading-relaxed">
                    Browse our premium collections and add items to your cart to get started.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-6 border border-black bg-black px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-white hover:bg-[#333333] transition-colors"
                    id="cart-empty-shop-btn"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => {
                    const itemKey = `${item.product.id}-${item.selectedSize || 'nosize'}-${item.selectedVariant?.id || 'novariant'}`;
                    return (
                      <div
                        key={itemKey}
                        className="flex items-center space-x-4 rounded-none border border-[#EEEEEE] p-3 bg-white"
                        id={`cart-item-${itemKey}`}
                      >
                        <img
                          src={item.selectedVariant?.image || item.product.image}
                          alt={item.product.name}
                          className="h-16 w-16 rounded-none object-cover bg-[#F5F5F5] border border-[#EEEEEE] shrink-0"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-black truncate">
                            {item.product.name}
                          </h4>

                          {/* Variant & Size Labels */}
                          <div className="flex flex-wrap gap-1.5 mt-1 mb-1.5">
                            {item.selectedVariant && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-[#F5F5F5] text-black border border-[#EEEEEE]">
                                {item.selectedVariant.colorCode && (
                                  <span
                                    className="h-2 w-2 rounded-full border border-black/10 shrink-0"
                                    style={{ backgroundColor: item.selectedVariant.colorCode }}
                                  />
                                )}
                                <span>{item.selectedVariant.name}</span>
                              </span>
                            )}
                            {item.selectedSize && (
                              <span className="inline-block px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-[#F5F5F5] text-black border border-[#EEEEEE] font-mono">
                                Size: {item.selectedSize}
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline space-x-1.5 mt-0.5">
                            <span className="text-[11px] font-bold text-black font-mono">
                              {formatCurrency(item.product.price)}
                            </span>
                            {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                              <span className="text-[10px] text-[#919191] line-through font-mono">
                                {formatCurrency(item.product.originalPrice)}
                              </span>
                            )}
                            <span className="text-[10px] text-[#717171] font-normal font-sans">each</span>
                          </div>

                          {/* Quantity adjusters */}
                          <div className="flex items-center space-x-2 mt-2">
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1, item.selectedSize, item.selectedVariant)}
                              className="flex h-6 w-6 items-center justify-center rounded-none bg-[#F5F5F5] border border-[#EEEEEE] text-xs font-bold text-black hover:bg-white"
                              id={`qty-minus-${itemKey}`}
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-black w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.selectedSize, item.selectedVariant)}
                              className="flex h-6 w-6 items-center justify-center rounded-none bg-[#F5F5F5] border border-[#EEEEEE] text-xs font-bold text-black hover:bg-white"
                              id={`qty-plus-${itemKey}`}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Delete item */}
                        <button
                          onClick={() => onRemoveItem(item.product.id, item.selectedSize, item.selectedVariant)}
                          className="rounded-none p-2 text-[#717171] hover:bg-[#F5F5F5] hover:text-black transition-colors"
                          id={`remove-item-btn-${itemKey}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Summary & COD Info */}
            {cartItems.length > 0 && (
              <div className="border-t border-[#EEEEEE] bg-[#FDFDFD] p-6 space-y-5">
                {/* Cash on delivery notice banner */}
                <div className="bg-[#F9F9F9] border border-[#EEEEEE] p-5 rounded-none space-y-2.5">
                  <div className="flex items-center gap-2 text-black">
                    <Info className="h-4.5 w-4.5 text-black shrink-0" />
                    <h5 className="text-xs font-bold uppercase tracking-wider">Payment Method</h5>
                  </div>
                  <p className="text-[11px] text-[#717171] leading-relaxed">
                    Our store exclusively supports <span className="text-black font-semibold">Payment on Delivery</span>.
                    Please have the exact amount ready when the courier arrives.
                  </p>
                </div>

                <div className="flex justify-between items-baseline border-t border-[#EEEEEE] pt-4">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#717171]">Subtotal</span>
                  <span className="text-2xl font-bold text-black">{formatCurrency(subtotal)}</span>
                </div>

                <button
                  onClick={onCheckout}
                  className="flex w-full items-center justify-center space-x-2 rounded-none bg-black py-4 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-[#333333] transition-colors"
                  id="proceed-to-checkout-btn"
                >
                  <span>Continue to Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
