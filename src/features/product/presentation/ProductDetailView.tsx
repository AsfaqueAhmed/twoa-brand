'use client';

import {
  ShoppingBag,
  CheckCircle,
  X,
  Ruler,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Truck,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Product, ProductVariant, SizeChart } from '@/shared/domain/types';
import { useRouter } from 'next/navigation';
import { useCart } from '@/features/cart/presentation/CartProvider';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { fetchSizeChartById } from '@/features/catalog/infrastructure/firestoreSizeChartsRepository';
import { getDefaultSize } from '@/features/catalog/domain/sizes';
import { TRUST_ITEMS } from '@/features/catalog/presentation/TrustStrip';
import {
  CITY_CORPORATION_DELIVERY_FEE,
  DHAKA_SUBURBAN_DELIVERY_FEE,
  STANDARD_DELIVERY_FEE,
} from '@/features/checkout/domain/pricing';
import { resolveAvailableStock } from '@/shared/domain/stock';
import { pixelViewContent } from '@/shared/lib/metaPixel';
import ProductImageStack from './ProductImageStack';
import Accordion from './Accordion';
import RelatedProducts from './RelatedProducts';

interface ProductDetailViewProps {
  product: Product;
  onClose?: () => void;
  previousProduct?: Product;
  nextProduct?: Product;
  onNavigate?: (offset: 1 | -1) => void;
  positionLabel?: { index: number; total: number };
  onSelectRelated?: (product: Product) => void;
}

export default function ProductDetailView({
  product,
  onClose: onCloseProp,
  previousProduct,
  nextProduct,
  onNavigate,
  positionLabel,
  onSelectRelated,
}: ProductDetailViewProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const onClose = onCloseProp ?? (() => router.push('/'));

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>(getDefaultSize(product) ?? '');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(product.variants?.[0] ?? null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [sizeChart, setSizeChart] = useState<SizeChart | null>(null);
  const availableStock = resolveAvailableStock(product, selectedSize);

  useEffect(() => {
    pixelViewContent(product);
  }, [product.id]);

  useEffect(() => {
    setSizeChart(null);
    if (!product.sizeChartId) return;
    let cancelled = false;
    fetchSizeChartById(product.sizeChartId).then((chart) => {
      if (!cancelled) setSizeChart(chart);
    });
    return () => {
      cancelled = true;
    };
  }, [product.sizeChartId]);

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedSize || undefined, selectedVariant || undefined);
    setQuantity(1);
    onClose();
  };

  const openSizeGuide = () => {
    setOpenSection('size-chart');
    requestAnimationFrame(() => {
      document.getElementById('accordion-size-chart')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const hasDiscount = !!(product.originalPrice && product.originalPrice > product.price);
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;
  const variants = product.variants ?? [];

  const accordionSections = [
    {
      id: 'description',
      title: 'Description',
      content: <p className="whitespace-pre-line">{product.description}</p>,
    },
    ...(sizeChart
      ? [
          {
            id: 'size-chart',
            title: 'Size Chart',
            content: (
              <div id="size-chart-panel">
                <span className="block text-[11px] font-bold uppercase tracking-widest text-[#717171] mb-2">
                  {sizeChart.name}
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E4E1DA] text-[#717171]">
                        <th className="py-2 text-left font-bold uppercase">Size</th>
                        {sizeChart.columns.map((col) => (
                          <th key={col} className="py-2 text-center font-mono font-bold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E1DA] text-black">
                      {sizeChart.rows.map((row, i) => (
                        <tr key={`${row.size}-${i}`} className={i % 2 === 1 ? 'bg-white/50' : undefined}>
                          <td className="py-2 text-left font-bold font-mono">{row.size}</td>
                          {sizeChart.columns.map((col, ci) => (
                            <td key={col} className="py-2 text-center font-mono">
                              {row.values[ci] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ),
          },
        ]
      : []),
    {
      id: 'shipping',
      title: 'Shipping & Delivery',
      content: (
        <div className="space-y-3">
          <p>Cash on delivery is available all over Bangladesh. Pay when you receive your order.</p>
          <ul className="space-y-1">
            <li className="flex justify-between">
              <span>City corporations (Dhaka North &amp; South)</span>
              <span className="font-semibold text-black">{formatCurrency(CITY_CORPORATION_DELIVERY_FEE)}</span>
            </li>
            <li className="flex justify-between">
              <span>Dhaka suburban areas</span>
              <span className="font-semibold text-black">{formatCurrency(DHAKA_SUBURBAN_DELIVERY_FEE)}</span>
            </li>
            <li className="flex justify-between">
              <span>Everywhere else</span>
              <span className="font-semibold text-black">{formatCurrency(STANDARD_DELIVERY_FEE)}</span>
            </li>
          </ul>
        </div>
      ),
    },
  ];

  const thumbnails = (className: string, mobile: boolean) =>
    variants.length > 1 && (
      <div className={className}>
        {variants.map((v) => {
          const isSelected = selectedVariant?.id === v.id;
          return (
            <button
              key={v.id}
              type="button"
              aria-label={v.name}
              aria-pressed={isSelected}
              onClick={() => setSelectedVariant(v)}
              className={`aspect-square shrink-0 overflow-hidden bg-[#F5F5F5] ${mobile ? 'h-16 w-16' : 'w-full'} ${
                isSelected ? 'border-2 border-black' : 'border border-[#E4E1DA]'
              }`}
            >
              <img src={v.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            </button>
          );
        })}
      </div>
    );

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-[#FAF9F6]" id="product-detail-view">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between bg-[#FAF9F6] px-4 sm:px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-semibold text-black hover:opacity-70 transition-opacity"
          id="product-modal-close"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Shop</span>
        </button>
        {positionLabel && (
          <div className="flex items-center gap-2 text-sm text-[#4A4A4A]">
            <button
              type="button"
              aria-label="Previous product"
              id="product-modal-prev-btn"
              disabled={!previousProduct}
              onClick={() => onNavigate?.(-1)}
              className="p-1 text-black disabled:text-[#B5B5B5] disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span>
              {positionLabel.index} of {positionLabel.total}
            </span>
            <button
              type="button"
              aria-label="Next product"
              id="product-modal-next-btn"
              disabled={!nextProduct}
              onClick={() => onNavigate?.(1)}
              className="p-1 text-black disabled:text-[#B5B5B5] disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <div id="product-detail-scroll" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-8 px-4 sm:px-6 pb-8">
          {/* Left: gallery */}
          <div>
            <div className="flex gap-3">
              {thumbnails('hidden md:flex flex-col gap-3 w-20 md:max-h-[clamp(320px,62vh,640px)] overflow-y-auto', false)}
              <div
                className="relative flex-1 aspect-[4/5] md:aspect-auto md:h-[clamp(320px,62vh,640px)] bg-[#F5F5F5] overflow-hidden"
                id="modal-product-image-container"
              >
                <ProductImageStack
                  image={selectedVariant?.image || product.image}
                  alt={product.name}
                  category={product.category}
                  previousImage={previousProduct?.image}
                  nextImage={nextProduct?.image}
                  onNavigate={onNavigate}
                  navKey={product.id}
                  discountPercent={discountPercent}
                />
              </div>
            </div>
            {thumbnails('md:hidden flex gap-2 mt-3 overflow-x-auto', true)}
          </div>

          {/* Right: info */}
          <div className="space-y-5 min-w-0">
            <h1 className="text-3xl font-bold text-black">{product.name}</h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-3xl font-bold text-black">{formatCurrency(product.price)}</span>
              {hasDiscount && discountPercent > 0 && (
                <>
                  <span className="text-base font-semibold text-[#919191] line-through">
                    {formatCurrency(product.originalPrice!)}
                  </span>
                  <span className="bg-red-600 text-white px-2 py-0.5 text-[11px] font-bold">
                    {discountPercent}% OFF
                  </span>
                </>
              )}
              <span className="inline-flex items-center gap-1.5 border border-[#E4E1DA] rounded-full px-3 py-1 text-xs font-semibold text-black sm:ml-auto">
                <Truck className="h-3.5 w-3.5" />
                Cash on Delivery Eligible
              </span>
            </div>

            <p className="line-clamp-2 text-sm text-[#4A4A4A]">{product.description}</p>

            <hr className="border-[#E4E1DA]" />

            {variants.length > 0 && (
              <div id="product-variant-section">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-black">Color / Design</span>
                  <span className="text-[#4A4A4A]">{selectedVariant?.name}</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        title={v.name}
                        aria-label={v.name}
                        aria-pressed={isSelected}
                        className={`h-16 w-16 overflow-hidden ${
                          isSelected ? 'border-2 border-black' : 'border border-[#E4E1DA] hover:border-black'
                        }`}
                        style={!v.image && v.colorCode ? { backgroundColor: v.colorCode } : undefined}
                      >
                        {v.image && (
                          <img src={v.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {product.parentProduct && product.parentProduct.sizeOrder.length > 0 && (
              <div id="product-size-section">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-black">Size</span>
                  {sizeChart && (
                    <button
                      type="button"
                      onClick={openSizeGuide}
                      className="flex items-center gap-1.5 text-sm font-semibold text-black underline underline-offset-4 hover:opacity-70"
                      id="toggle-size-chart-btn"
                    >
                      <Ruler className="h-4 w-4" />
                      <span>Size Guide</span>
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.parentProduct.sizeOrder.map((sz) => {
                    const sizeStock = product.parentProduct!.stockBySize[sz] ?? 0;
                    return (
                      <button
                        key={sz}
                        type="button"
                        disabled={sizeStock <= 0}
                        aria-pressed={selectedSize === sz}
                        onClick={() => {
                          setSelectedSize(sz);
                          setQuantity(1);
                        }}
                        className={`min-w-[56px] h-12 px-3 flex items-center justify-center text-sm font-semibold border transition-colors ${
                          selectedSize === sz
                            ? 'bg-black text-white border-black'
                            : sizeStock <= 0
                              ? 'bg-[#EFEDE8] text-[#B5B5B5] border-[#E4E1DA] line-through cursor-not-allowed'
                              : 'bg-white text-black border-[#E4E1DA] hover:border-black'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Availability */}
            {product.parentProduct && selectedSize && availableStock > 0 ? (
              <div className="flex items-center gap-2 border border-[#D5E3CC] bg-[#E9F0E4] p-3 text-sm font-semibold text-[#2F5D1E]">
                <CheckCircle className="h-5 w-5" />
                <span>In Stock ({availableStock} left)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 border border-[#E4E1DA] bg-[#F3F3F3] p-3 text-sm font-semibold text-[#717171]">
                {!product.parentProduct ? (
                  <>
                    <X className="h-5 w-5" />
                    <span>Unavailable</span>
                  </>
                ) : !selectedSize ? (
                  <span>Select a size to see availability</span>
                ) : (
                  <>
                    <X className="h-5 w-5" />
                    <span>Temporarily Out of Stock</span>
                  </>
                )}
              </div>
            )}

            {product.parentProduct && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div>
                  <span className="mb-2 block text-sm font-semibold text-black">Quantity</span>
                  <div className="flex h-14 items-center border border-[#E4E1DA] bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex h-full w-12 items-center justify-center text-lg text-black hover:bg-[#F5F5F5]"
                      id="modal-qty-minus"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-black">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, Math.min(availableStock, q + 1)))}
                      className="flex h-full w-12 items-center justify-center text-lg text-black hover:bg-[#F5F5F5]"
                      id="modal-qty-plus"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!selectedSize || availableStock <= 0}
                  className="flex h-14 w-full flex-1 items-center justify-center gap-2 bg-black px-4 text-sm font-bold text-white transition-colors hover:bg-[#333333] disabled:bg-[#B5B5B5] disabled:cursor-not-allowed"
                  id="modal-add-to-cart-action"
                >
                  <ShoppingBag className="h-5 w-5" />
                  <span>
                    {!selectedSize
                      ? 'Select a Size'
                      : availableStock <= 0
                        ? 'Out of Stock'
                        : `Add to Cart${selectedVariant ? ` (${selectedVariant.name} – ${selectedSize})` : ` (${selectedSize})`} – ${formatCurrency(product.price * quantity)}`}
                  </span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 border-y border-[#E4E1DA] py-4">
              {TRUST_ITEMS.map(({ icon: Icon, title, subtitle }) => (
                <div key={title} className="flex flex-col items-center gap-1 text-center">
                  <Icon className="h-6 w-6 text-black" strokeWidth={1.25} />
                  <p className="text-xs font-bold text-black">{title}</p>
                  <p className="text-[11px] text-[#717171]">{subtitle}</p>
                </div>
              ))}
            </div>

            <Accordion
              sections={accordionSections}
              openId={openSection}
              onToggle={(id) => setOpenSection((cur) => (cur === id ? null : id))}
            />
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-10">
          <RelatedProducts
            product={product}
            onSelect={onSelectRelated ?? ((p) => router.replace(`/product?id=${p.id}`))}
          />
        </div>
      </div>
    </div>
  );
}
