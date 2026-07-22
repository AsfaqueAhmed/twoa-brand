'use client';

import { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import type { Product } from '@/shared/domain/types';
import { motion } from 'motion/react';
import { formatCurrency } from '@/shared/lib/formatCurrency';

interface ProductCardProps {
  key?: string;
  product: Product;
  onSelect: (product: Product) => void;
  onAddToCart: (product: Product, e: any) => void;
}

export default function ProductCard({ product, onSelect, onAddToCart }: ProductCardProps) {
  const hasDiscount = !!(product.originalPrice && product.originalPrice > product.price);
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  const hasVariants = !!(product.variants && product.variants.length > 0);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const autoPlayTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!hasVariants || isHovered) {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      return;
    }

    // Auto-rotate image every 3.5s
    autoPlayTimerRef.current = setInterval(() => {
      setActiveVariantIndex((prevIndex) => (prevIndex + 1) % product.variants!.length);
    }, 3500);

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, [hasVariants, isHovered, product.variants?.length]);

  const displayedImage = hasVariants
    ? product.variants![activeVariantIndex]?.image || product.image
    : product.image;

  const displayedVariantName = hasVariants
    ? product.variants![activeVariantIndex]?.name
    : null;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex flex-col overflow-hidden rounded-none border border-[#EEEEEE] bg-white transition-all duration-300 cursor-pointer"
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
        />
        {/* Category tag */}
        <span className="absolute top-3 left-3 bg-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white">
          {product.category}
        </span>

        {/* Discount Badge */}
        {hasDiscount && product.stock > 0 && (
          <span className="absolute top-3 right-3 bg-red-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white font-mono">
            {discountPercent}% OFF
          </span>
        )}

        {/* Out of Stock banner */}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-xs">
            <span className="bg-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Out of stock
            </span>
          </div>
        )}

        {/* Small thumbnail indicators of variants */}
        {hasVariants && (
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {product.variants!.map((v, idx) => {
              const isActive = activeVariantIndex === idx;
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`relative h-7 w-7 p-[1.5px] bg-white overflow-hidden transition-all duration-200 ${
                    isActive
                      ? 'border-2 border-black scale-105 shadow-sm'
                      : 'border border-black/10 hover:border-black/30'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveVariantIndex(idx);
                  }}
                  onMouseEnter={() => {
                    setActiveVariantIndex(idx);
                  }}
                  title={v.name}
                >
                  <img
                    src={v.image || product.image}
                    alt={v.name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Container */}
      <div className="flex flex-1 flex-col p-3 sm:p-5">
        {/* Rating and Reviews */}
        <div className="flex items-center space-x-1 text-black">
          <Star className="h-3 w-3 fill-black text-black" />
          <span className="text-[11px] font-bold text-black">{product.rating}</span>
          <span className="text-[10px] text-[#717171] font-normal tracking-wide">(Verified)</span>
        </div>

        {/* Title */}
        <h3 className="mt-2 text-[14px] font-bold uppercase tracking-wider text-black line-clamp-1 group-hover:text-[#717171] transition-colors">
          {product.name}
        </h3>

        {/* Short Description */}
        <p className="mt-1 text-xs text-[#717171] line-clamp-2 leading-relaxed">{product.description}</p>

        {/* Active Variant Indicator */}
        {hasVariants && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#919191]">Color/Design:</span>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-black bg-[#FAF9F6] border border-[#EEEEEE] px-1.5 py-0.5">
              {product.variants![activeVariantIndex]?.colorCode && (
                <span
                  className="h-2 w-2 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: product.variants![activeVariantIndex].colorCode }}
                />
              )}
              <span>{displayedVariantName}</span>
            </span>
          </div>
        )}

        {/* Available Sizes Variant */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="mt-3 mb-4 flex flex-wrap items-center gap-1.5" id={`product-card-sizes-${product.id}`}>
            <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#919191]">Sizes:</span>
            {product.sizes.map((sz) => (
              <span
                key={sz}
                className="inline-flex h-5 min-w-[20px] px-1.5 items-center justify-center text-[9px] font-bold font-mono text-black border border-[#EEEEEE] bg-[#FAF9F6]"
              >
                {sz}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#EEEEEE]">
          <div>
            <span className="text-[9px] text-[#717171] block font-bold uppercase tracking-[0.15em] leading-none mb-1">
              Price
            </span>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-black leading-tight">{formatCurrency(product.price)}</span>
              {hasDiscount && (
                <span className="text-[10px] text-[#919191] line-through font-semibold font-mono mt-0.5 leading-none">
                  {product.originalPrice !== undefined && formatCurrency(product.originalPrice)}
                </span>
              )}
            </div>
          </div>

          <button
            id={`add-to-cart-btn-${product.id}`}
            disabled={product.stock === 0}
            onClick={(e) => onAddToCart(product, e)}
            className="flex h-9 px-2.5 sm:px-4 items-center justify-center border border-black bg-black text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:bg-[#F5F5F5] disabled:border-[#EEEEEE] disabled:text-[#A1A1A1]"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </motion.div>
  );
}
