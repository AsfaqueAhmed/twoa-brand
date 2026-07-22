'use client';

import { Star, ShoppingBag, CheckCircle, X, Ruler } from 'lucide-react';
import { useState } from 'react';
import type { Product, ProductVariant } from '@/shared/domain/types';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/features/cart/presentation/CartProvider';
import { formatCurrency } from '@/shared/lib/formatCurrency';

interface ProductDetailViewProps {
  product: Product;
  onClose?: () => void;
}

export default function ProductDetailView({ product, onClose: onCloseProp }: ProductDetailViewProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const onClose = onCloseProp ?? (() => router.push('/'));
  const onAddToCart = (p: Product, quantity: number, selectedSize?: string, selectedVariant?: ProductVariant) =>
    addToCart(p, quantity, selectedSize, selectedVariant);

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] ?? '');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(product.variants?.[0] ?? null);
  const [showSizeChart, setShowSizeChart] = useState(false);

  const handleAddToCart = () => {
    onAddToCart(product, quantity, selectedSize || undefined, selectedVariant || undefined);
    setQuantity(1);
    onClose();
  };

  return (
    <div className="relative w-full flex flex-col md:flex-row" id="product-detail-view">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 rounded-none border border-[#EEEEEE] bg-white/95 backdrop-blur-xs p-2 text-black hover:bg-black hover:text-white hover:border-black transition-all duration-200 shadow-sm"
        id="product-modal-close"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Image side */}
      <div
        className="relative w-full aspect-square md:w-[45%] lg:w-[50%] bg-[#F5F5F5] shrink-0"
        id="modal-product-image-container"
      >
        <img
          src={selectedVariant?.image || product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-all duration-300"
          referrerPolicy="no-referrer"
        />
        <span className="absolute top-4 left-4 bg-black px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white">
          {product.category}
        </span>
      </div>

      {/* Info side */}
      <div className="w-full md:w-[55%] lg:w-[50%] flex flex-col p-6 sm:p-8 justify-between md:overflow-y-auto md:max-h-[85vh] bg-[#FDFDFD]">
        <div>
          {/* Reviews and rating */}
          <div className="flex items-center space-x-1 text-black">
            <Star className="h-4 w-4 fill-black text-black" />
            <span className="text-xs font-bold text-black">{product.rating}</span>
            <span className="text-[11px] text-[#717171] tracking-wide">(Verified Reviews)</span>
          </div>

          <h2 className="mt-3 font-sans text-xl font-bold tracking-tight text-[#1A1A1A] uppercase">
            {product.name}
          </h2>

          {/* Price Tag */}
          <div className="mt-4 flex flex-wrap items-baseline gap-2.5">
            <span className="text-2xl font-bold text-black">{formatCurrency(product.price)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <>
                <span className="text-sm font-semibold text-[#919191] line-through font-mono">
                  {formatCurrency(product.originalPrice)}
                </span>
                <span className="bg-red-600 text-white px-2 py-0.5 text-[9px] uppercase font-bold tracking-[0.1em] font-mono">
                  {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                </span>
              </>
            )}
            <span className="border border-black text-black px-2 py-0.5 text-[9px] uppercase font-bold tracking-[0.1em]">
              Cash on Delivery Eligible
            </span>
          </div>

          <div className="mt-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#717171]">Description</h3>
            <p className="mt-2 text-xs leading-relaxed text-[#717171]">{product.description}</p>
          </div>

          {/* Color / Design Variant Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="mt-6 border-t border-[#EEEEEE] pt-6" id="product-variant-section">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#717171] block mb-3">
                Select Design/Color: <span className="text-black font-semibold ml-1">{selectedVariant?.name}</span>
              </span>

              {/* Swatch list */}
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`flex items-center space-x-2 px-3 py-1.5 border rounded-none text-xs font-bold transition-all duration-200 ${
                        isSelected
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-black border-[#EEEEEE] hover:border-black'
                      }`}
                      title={v.name}
                    >
                      {v.colorCode && (
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: v.colorCode }}
                        />
                      )}
                      <span>{v.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Variant Selector */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="mt-6 border-t border-[#EEEEEE] pt-6" id="product-size-section">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#717171]">
                  Select Size: <span className="text-black font-mono font-bold ml-1">{selectedSize}</span>
                </span>

                {/* View Size Chart Button */}
                <button
                  type="button"
                  onClick={() => setShowSizeChart(!showSizeChart)}
                  className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-black border-b border-black hover:opacity-70 transition-opacity"
                  id="toggle-size-chart-btn"
                >
                  <Ruler className="h-3 w-3" />
                  <span>{showSizeChart ? 'Hide Size Chart' : 'View Size Chart'}</span>
                </button>
              </div>

              {/* Size pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {product.sizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`min-w-[40px] h-10 px-3 flex items-center justify-center text-xs font-bold font-mono transition-all duration-200 border rounded-none ${
                      selectedSize === sz
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-[#EEEEEE] hover:border-black'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>

              {/* Size Chart Table Panel */}
              <AnimatePresence>
                {showSizeChart && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border border-[#EEEEEE] bg-[#FAF9F6] p-4 rounded-none mb-4"
                    id="size-chart-panel"
                  >
                    <span className="block text-[9px] font-bold uppercase tracking-widest text-[#717171] mb-2">
                      Standard Fit Guide (inches)
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#EEEEEE] text-[#717171]">
                            <th className="py-2 font-bold uppercase">Size</th>
                            <th className="py-2 font-mono font-bold">Chest</th>
                            <th className="py-2 font-mono font-bold">Length</th>
                            <th className="py-2 font-mono font-bold">Shoulder</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE] text-black">
                          <tr>
                            <td className="py-2 font-bold font-mono">S</td>
                            <td className="py-2 font-mono">36" - 38"</td>
                            <td className="py-2 font-mono">27"</td>
                            <td className="py-2 font-mono">17.5"</td>
                          </tr>
                          <tr className="bg-white/50">
                            <td className="py-2 font-bold font-mono">M</td>
                            <td className="py-2 font-mono">38" - 40"</td>
                            <td className="py-2 font-mono">28"</td>
                            <td className="py-2 font-mono">18.0"</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-bold font-mono">L</td>
                            <td className="py-2 font-mono">40" - 42"</td>
                            <td className="py-2 font-mono">29"</td>
                            <td className="py-2 font-mono">18.5"</td>
                          </tr>
                          <tr className="bg-white/50">
                            <td className="py-2 font-bold font-mono">XL</td>
                            <td className="py-2 font-mono">42" - 44"</td>
                            <td className="py-2 font-mono">30"</td>
                            <td className="py-2 font-mono">19.0"</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[8px] text-[#919191] italic mt-3 leading-relaxed">
                      * Recommended to order your standard size for a boxy drape, or size down for a slimmer athletic
                      silhouette.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Stock Status */}
          <div className="mt-6 flex items-center space-x-2 rounded-none border border-[#EEEEEE] bg-[#F9F9F9] p-3">
            {product.stock > 0 ? (
              <>
                <CheckCircle className="h-4.5 w-4.5 text-black" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                  In Stock ({product.stock} units left)
                </span>
              </>
            ) : (
              <>
                <X className="h-4.5 w-4.5 text-[#717171]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#717171]">
                  Temporarily Out of Stock
                </span>
              </>
            )}
          </div>
        </div>

        {/* Add to Cart Actions */}
        {product.stock > 0 && (
          <div className="mt-8 space-y-4">
            {/* Quantity selector */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#717171]">Quantity</span>
              <div className="flex items-center space-x-1 rounded-none border border-[#EEEEEE] p-0.5 bg-[#F5F5F5]">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-8 w-8 items-center justify-center text-black hover:bg-white transition-colors"
                  id="modal-qty-minus"
                >
                  -
                </button>
                <span className="w-10 text-center text-xs font-bold text-black">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  className="flex h-8 w-8 items-center justify-center text-black hover:bg-white transition-colors"
                  id="modal-qty-plus"
                >
                  +
                </button>
              </div>
            </div>

            {/* Submit Add to Cart */}
            <button
              onClick={handleAddToCart}
              className="flex w-full items-center justify-center space-x-2 rounded-none bg-black py-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#333333]"
              id="modal-add-to-cart-action"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>
                Add to Cart
                {selectedVariant || selectedSize ? ' (' : ''}
                {selectedVariant ? selectedVariant.name : ''}
                {selectedVariant && selectedSize ? ' - ' : ''}
                {selectedSize ? selectedSize : ''}
                {selectedVariant || selectedSize ? ')' : ''} - {formatCurrency(product.price * quantity)}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
