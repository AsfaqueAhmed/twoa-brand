'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem } from '@/shared/domain/types';
import { resolveAvailableStock } from '@/shared/domain/stock';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { discountPercent } from '../domain/cart';
import { useCart } from './CartProvider';
import { ThumbImage } from '@/shared/ui/ThumbImage';

const CART_ROW_GRID =
  'sm:grid sm:grid-cols-[minmax(0,1fr)_110px_130px_100px_40px] sm:items-center sm:gap-4';

export default function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeFromCart, changeVariant } = useCart();
  const { product, quantity, selectedSize, selectedVariant } = item;
  const stock = resolveAvailableStock(product, selectedSize);
  const percent = discountPercent(product);
  const variants = product.variants ?? [];
  const itemKey = `${product.id}-${selectedSize || 'nosize'}-${selectedVariant?.id || 'novariant'}`;

  return (
    <div className={`${CART_ROW_GRID} flex flex-wrap items-center gap-x-3 gap-y-3 py-4 sm:py-5 border-b border-[#EEEEEE] last:border-b-0`} id={`cart-row-${itemKey}`}>
      {/* Product */}
      <div className="flex w-full gap-3 sm:gap-4 min-w-0 sm:w-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <ThumbImage
          src={selectedVariant?.image || product.image}
          alt={product.name}
          className="h-24 w-[76px] sm:w-20 shrink-0 object-cover bg-[#F5F5F5]"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-bold text-black max-sm:line-clamp-2 sm:truncate">{product.name}</h3>
          {selectedVariant && <p className="text-xs text-[#717171]">Color: {selectedVariant.name}</p>}
          {selectedSize && <p className="text-xs text-[#717171]">Size: {selectedSize}</p>}
          <p className="flex items-center gap-2 pt-0.5 text-sm font-bold text-black sm:hidden">
            {formatCurrency(product.price)}
            {percent !== undefined && (
              <span className="text-xs font-normal text-[#717171] line-through">{formatCurrency(product.originalPrice!)}</span>
            )}
          </p>
          {variants.length > 1 && (
            <div className="flex gap-1.5 pt-1">
              {variants.map((v) => {
                const active = v.id === selectedVariant?.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    title={v.name}
                    aria-label={`Change color to ${v.name}`}
                    aria-pressed={active}
                    onClick={() => changeVariant(product.id, selectedSize, selectedVariant, v)}
                    className={`h-8 w-8 overflow-hidden border ${active ? 'border-black ring-1 ring-black' : 'border-[#EEEEEE]'}`}
                  >
                    {v.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <ThumbImage src={v.image} alt={v.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="block h-full w-full" style={{ backgroundColor: v.colorCode || '#EEEEEE' }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="hidden items-center gap-2 sm:block">
        <p className="text-sm font-bold text-black">{formatCurrency(product.price)}</p>
        {percent !== undefined && (
          <>
            <p className="text-xs text-[#717171] line-through">{formatCurrency(product.originalPrice!)}</p>
            <span className="inline-block bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
              {percent}% off
            </span>
          </>
        )}
      </div>

      {/* Quantity */}
      <div className="flex items-center border border-[#EEEEEE] w-fit">
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={() => updateQuantity(product.id, quantity - 1, selectedSize, selectedVariant)}
          className="h-9 w-9 flex items-center justify-center hover:bg-[#F5F5F5]"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-9 text-center text-sm font-bold">{quantity}</span>
        <button
          type="button"
          aria-label="Increase quantity"
          disabled={quantity >= stock}
          onClick={() => updateQuantity(product.id, quantity + 1, selectedSize, selectedVariant)}
          className="h-9 w-9 flex items-center justify-center hover:bg-[#F5F5F5] disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Line total */}
      <p className="ml-auto text-sm font-bold text-black sm:ml-0">{formatCurrency(product.price * quantity)}</p>

      {/* Remove */}
      <button
        type="button"
        aria-label={`Remove ${product.name}`}
        onClick={() => removeFromCart(product.id, selectedSize, selectedVariant)}
        className="p-2 text-[#717171] hover:bg-[#F5F5F5] hover:text-black transition-colors w-fit -mr-2 sm:mr-0"
        id={`remove-item-btn-${itemKey}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
