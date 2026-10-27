'use client';

import { ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useCart } from './CartProvider';
import CartItemRow from './CartItemRow';
import OrderSummary from './OrderSummary';
import CartRecommendations from './CartRecommendations';

export default function CartPage() {
  const { items, count } = useCart();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-black">Shopping Cart</h1>
          <p className="text-sm text-[#717171] mt-1">
            {count} {count === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>
        <Link
          href="/"
          className="hidden sm:flex items-center gap-2 border border-[#EEEEEE] px-4 py-2.5 text-sm font-medium text-black hover:bg-[#F5F5F5]"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 border border-[#EEEEEE]">
          <div className="flex h-16 w-16 items-center justify-center border border-[#EEEEEE] bg-[#F5F5F5] text-[#717171] mb-5">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-black">Your bag is empty</h2>
          <p className="text-sm text-[#717171] mt-1 mb-6">Add something you love to get started.</p>
          <Link
            href="/"
            className="bg-black px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-[#333333]"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
          <section className="border border-[#EEEEEE] bg-white px-4 sm:px-6">
            <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_110px_130px_100px_40px] sm:gap-4 py-4 border-b border-[#EEEEEE] text-xs text-[#717171]">
              <span>Product</span>
              <span>Price</span>
              <span>Quantity</span>
              <span>Total</span>
              <span />
            </div>
            {items.map((item) => (
              <CartItemRow
                key={`${item.product.id}-${item.selectedSize || 'nosize'}-${item.selectedVariant?.id || 'novariant'}`}
                item={item}
              />
            ))}
          </section>
          <OrderSummary />
        </div>
      )}

      <CartRecommendations />
    </div>
  );
}
