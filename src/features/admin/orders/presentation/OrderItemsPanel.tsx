'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Download, ImageIcon, ShoppingBag } from 'lucide-react';
import type { Order, Product } from '@/shared/domain/types';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { buildOrderImages, itemThumbnails } from '../domain/orderImages';
import OrderImagesModal from './OrderImagesModal';
import { ThumbImage } from '@/shared/ui/ThumbImage';
import { getQuote } from '@/features/admin/customQuotes/infrastructure/customQuotesAdminRepository';
import { downloadQuoteZip } from '@/features/admin/customQuotes/application/buildQuoteZip';

interface Props {
  order: Order;
  productsById?: Map<string, Product>;
}

const tag = 'rounded-md border border-[#EEEEEE] bg-[#FAF9F6] px-2.5 py-1 text-[11px] font-medium text-black';

function QuoteZipButton({ quoteId, labelWithId }: { quoteId: string; labelWithId: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const quote = await getQuote(quoteId);
      if (!quote) {
        setError('Quote not found');
        return;
      }
      await downloadQuoteZip(quote);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Link href={`/admin/custom-quotes?id=${encodeURIComponent(quoteId)}`} className="text-[11px] font-semibold text-black underline">
        Quote {quoteId}
      </Link>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-[#EEEEEE] bg-white px-3 py-1.5 text-[11px] font-semibold text-black hover:border-black disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" /> {busy ? 'Preparing...' : labelWithId ? `Download design ZIP (${quoteId})` : 'Download design ZIP'}
      </button>
      {error && <span role="alert" className="text-[11px] text-red-700">{error}</span>}
    </div>
  );
}

export default function OrderItemsPanel({ order, productsById }: Props) {
  const [showImages, setShowImages] = useState(false);
  const closeImages = useCallback(() => setShowImages(false), []);

  // One ZIP button per design: a design ordered in several sizes has several items with the same quote id.
  const seenQuotes = new Set<string>();
  const designCount = new Set(order.items.map((i) => i.customQuoteId).filter(Boolean)).size;
  return (
    <section className="rounded-lg border border-[#EEEEEE] bg-[#FAF9F6] p-4 text-xs">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-bold text-black">
          <ShoppingBag className="h-4 w-4" /> Order Items ({order.items.length})
        </h4>
        <button
          type="button"
          onClick={() => setShowImages(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#EEEEEE] bg-white px-3 py-1.5 text-[11px] font-semibold text-black hover:border-black"
        >
          <ImageIcon className="h-3.5 w-3.5" /> View All Product Images
        </button>
      </div>
      <div className="divide-y divide-[#EEEEEE] rounded-lg border border-[#EEEEEE] bg-white p-4">
        {order.items.map((item, idx) => {
          const quoteId = item.customQuoteId;
          const showZip = !!quoteId && !seenQuotes.has(quoteId);
          if (quoteId) seenQuotes.add(quoteId);
          const thumbs = itemThumbnails(item.productId, productsById);
          return (
            <div key={idx} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
              <div className="flex shrink-0 gap-2">
                {item.image ? (
                  <ThumbImage
                    src={item.image}
                    alt={item.name}
                    className="h-28 w-28 rounded-md border border-[#EEEEEE] bg-[#F5F5F5] object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                ) : (
                  <span className="h-28 w-28 rounded-md bg-[#F5F5F5]" />
                )}
                {thumbs.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {thumbs.map((src, i) => (
                      <ThumbImage
                        key={i}
                        src={src}
                        alt={`${item.name} ${i + 1}`}
                        className="h-8 w-8 rounded border border-[#EEEEEE] bg-[#F5F5F5] object-cover"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-black">{item.name}</span>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {quoteId && <span className={tag}>Custom design</span>}
                  {item.selectedVariant && <span className={tag}>{item.selectedVariant.name}</span>}
                  {item.selectedSize && <span className={tag}>Size: {item.selectedSize}</span>}
                  <span className={tag}>Qty: {item.quantity}</span>
                </div>
                {showZip && quoteId && <QuoteZipButton quoteId={quoteId} labelWithId={designCount > 1} />}
              </div>
              <span className="font-mono text-sm font-bold text-black">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          );
        })}
      </div>
      {showImages && <OrderImagesModal images={buildOrderImages(order, productsById)} onClose={closeImages} />}
    </section>
  );
}
