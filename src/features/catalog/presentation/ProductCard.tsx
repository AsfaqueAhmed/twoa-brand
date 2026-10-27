'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import type { Product, ProductVariant } from '@/shared/domain/types';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { isProductOutOfStock } from '@/shared/domain/stock';
import { getDefaultSize, getInStockSizes } from '../domain/sizes';

interface ProductCardProps {
  key?: string;
  product: Product;
  onSelect: (product: Product) => void;
  onAddToCart: (
    product: Product,
    size: string | undefined,
    variant: ProductVariant | undefined,
    e: React.MouseEvent
  ) => void;
}

export default function ProductCard({ product, onSelect, onAddToCart }: ProductCardProps) {
  const hasDiscount = !!(product.originalPrice && product.originalPrice > product.price);
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;
  const outOfStock = isProductOutOfStock(product);

  const variants = product.variants ?? [];
  const hasVariants = variants.length > 0;
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [userPickedVariant, setUserPickedVariant] = useState(false);

  const inStockSizes = getInStockSizes(product);
  const [pickedSize, setPickedSize] = useState<string | undefined>(() => getDefaultSize(product));
  // Fall back to the default if the picked size went out of stock after a refresh.
  const selectedSize = pickedSize && inStockSizes.includes(pickedSize) ? pickedSize : getDefaultSize(product);

  // Auto-rotate variant images every 3.5s until hovered or the shopper picks one.
  useEffect(() => {
    if (!hasVariants || isHovered || userPickedVariant) return;
    const timer = setInterval(() => {
      setActiveVariantIndex((i) => (i + 1) % variants.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [hasVariants, isHovered, userPickedVariant, variants.length]);

  const activeVariant: ProductVariant | undefined = hasVariants ? variants[Math.min(activeVariantIndex, variants.length - 1)] : undefined;
  const displayedImage = activeVariant?.image || product.image;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex flex-col overflow-hidden rounded-none bg-white cursor-pointer"
      onClick={() => onSelect(product)}
      id={`product-card-${product.id}`}
    >
      {/* Product Image */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[#F5F5F5]">
        <img
          src={displayedImage}
          alt={product.name}
          className="h-full w-full object-cover object-center transition-all duration-500 group-hover:scale-103"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-black/80 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] text-white">
          {product.category}
        </span>

        {hasDiscount && !outOfStock && (
          <span className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-red-600 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.1em] text-white font-mono">
            {discountPercent}% OFF
          </span>
        )}

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-xs">
            <span className="bg-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Out of stock
            </span>
          </div>
        )}

        {hasVariants && (
          <div
            className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 flex items-center gap-1.5 sm:gap-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {variants.map((v, idx) => {
              const isActive = activeVariantIndex === idx;
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-label={v.name}
                  aria-pressed={isActive}
                  title={v.name}
                  className={`relative h-7 w-7 sm:h-8 sm:w-8 p-[1.5px] bg-white overflow-hidden transition-all duration-200 ${
                    isActive
                      ? 'border-2 border-black scale-105 shadow-sm'
                      : 'border border-black/10 hover:border-black/30'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveVariantIndex(idx);
                    setUserPickedVariant(true);
                  }}
                  onMouseEnter={() => setActiveVariantIndex(idx)}
                >
                  <img
                    src={v.image || product.image}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col pt-2.5 sm:pt-3 pb-1">
        <h3 className="text-[13px] sm:text-[14px] font-bold text-black line-clamp-1">{product.name}</h3>
        <p className="mt-1 hidden sm:line-clamp-2 text-xs text-[#717171] leading-relaxed">{product.description}</p>

        {activeVariant && (
          <div className="mt-1 sm:mt-2.5 flex items-center gap-2 text-[11px] sm:text-xs text-[#717171]">
            {activeVariant.colorCode && (
              <span
                className="h-3 w-3 rounded-full border border-black/10 shrink-0"
                style={{ backgroundColor: activeVariant.colorCode }}
              />
            )}
            <span className="truncate">{activeVariant.name}</span>
          </div>
        )}

        {inStockSizes.length > 0 && (
          <div
            className="mt-2 sm:mt-2.5 flex flex-wrap items-center gap-1 sm:gap-1.5"
            id={`product-card-sizes-${product.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            {inStockSizes.map((sz) => (
              <button
                key={sz}
                type="button"
                aria-pressed={selectedSize === sz}
                onClick={(e) => {
                  e.stopPropagation();
                  setPickedSize(sz);
                }}
                className={`inline-flex h-6 min-w-[26px] px-1.5 sm:min-w-[28px] sm:px-2 items-center justify-center text-[10px] font-bold font-mono transition-colors ${
                  selectedSize === sz
                    ? 'bg-[#4A4A4A] text-white'
                    : 'bg-[#F0EEE9] text-black hover:bg-[#E4E1DA]'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        )}

        <div className="mt-2 sm:mt-3 flex flex-wrap items-baseline gap-x-2 sm:flex-nowrap sm:gap-2">
          <span className="text-[15px] sm:text-[16px] font-bold text-black leading-tight">{formatCurrency(product.price)}</span>
          {hasDiscount && product.originalPrice !== undefined && (
            <span className="text-[11px] text-[#919191] line-through font-semibold font-mono">
              {formatCurrency(product.originalPrice)}
            </span>
          )}
        </div>

        <button
          id={`add-to-cart-btn-${product.id}`}
          disabled={outOfStock}
          onClick={(e) => onAddToCart(product, selectedSize, activeVariant, e)}
          className="mt-2.5 sm:mt-3 flex h-9 sm:h-10 w-full items-center justify-center gap-1.5 sm:gap-2 bg-black text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors hover:bg-[#333333] disabled:cursor-not-allowed disabled:bg-[#E4E1DA] disabled:text-[#A1A1A1]"
        >
          <ShoppingBag className="h-4 w-4" />
          Add to Cart
        </button>
      </div>
    </motion.div>
  );
}
