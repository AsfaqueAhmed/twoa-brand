'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { CartItem, Product, ProductVariant } from '@/shared/domain/types';
import {
  addItem, updateItemQuantity, removeItem, changeVariant,
  computeSubtotal, computeCartCount,
} from '../domain/cart';
import { loadCart, saveCart } from '../infrastructure/localStorageCartRepository';
import { resolveAvailableStock } from '@/shared/domain/stock';
import { pixelAddToCart } from '@/shared/lib/metaPixel';

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedSize?: string, selectedVariant?: ProductVariant) => void;
  updateQuantity: (productId: string, quantity: number, selectedSize?: string, selectedVariant?: ProductVariant) => void;
  removeFromCart: (productId: string, selectedSize?: string, selectedVariant?: ProductVariant) => void;
  changeVariant: (
    productId: string,
    selectedSize: string | undefined,
    oldVariant: ProductVariant | undefined,
    newVariant: ProductVariant
  ) => void;
  subtotal: number;
  count: number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart());

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const value: CartContextValue = {
    items,
    addToCart: (product, quantity = 1, selectedSize, selectedVariant) => {
      if (resolveAvailableStock(product, selectedSize) > 0) {
        pixelAddToCart(product, quantity, selectedSize);
      }
      setItems((prev) => addItem(prev, product, quantity, selectedSize, selectedVariant));
    },
    updateQuantity: (productId, quantity, selectedSize, selectedVariant) =>
      setItems((prev) => {
        const existing = prev.find(
          (i) =>
            i.product.id === productId &&
            i.selectedSize === selectedSize &&
            i.selectedVariant?.id === selectedVariant?.id
        );
        const stock = existing ? resolveAvailableStock(existing.product, selectedSize) : 0;
        return updateItemQuantity(prev, productId, quantity, selectedSize, selectedVariant, stock);
      }),
    removeFromCart: (productId, selectedSize, selectedVariant) =>
      setItems((prev) => removeItem(prev, productId, selectedSize, selectedVariant)),
    changeVariant: (productId, selectedSize, oldVariant, newVariant) =>
      setItems((prev) => changeVariant(prev, productId, selectedSize, oldVariant, newVariant)),
    subtotal: computeSubtotal(items),
    count: computeCartCount(items),
    clearCart: () => setItems([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
