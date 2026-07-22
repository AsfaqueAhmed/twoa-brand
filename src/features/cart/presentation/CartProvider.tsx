'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { CartItem, Product, ProductVariant } from '@/shared/domain/types';
import { addItem, updateItemQuantity, removeItem, computeSubtotal, computeCartCount } from '../domain/cart';
import { loadCart, saveCart } from '../infrastructure/localStorageCartRepository';

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedSize?: string, selectedVariant?: ProductVariant) => void;
  updateQuantity: (productId: string, quantity: number, selectedSize?: string, selectedVariant?: ProductVariant) => void;
  removeFromCart: (productId: string, selectedSize?: string, selectedVariant?: ProductVariant) => void;
  subtotal: number;
  count: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const value: CartContextValue = {
    items,
    addToCart: (product, quantity = 1, selectedSize, selectedVariant) =>
      setItems((prev) => addItem(prev, product, quantity, selectedSize, selectedVariant)),
    updateQuantity: (productId, quantity, selectedSize, selectedVariant) =>
      setItems((prev) => {
        const stock = prev.find((i) => i.product.id === productId)?.product.stock ?? 0;
        return updateItemQuantity(prev, productId, quantity, selectedSize, selectedVariant, stock);
      }),
    removeFromCart: (productId, selectedSize, selectedVariant) =>
      setItems((prev) => removeItem(prev, productId, selectedSize, selectedVariant)),
    subtotal: computeSubtotal(items),
    count: computeCartCount(items),
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    clearCart: () => setItems([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
