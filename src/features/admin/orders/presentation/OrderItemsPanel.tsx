'use client';

import { useState } from 'react';
import { ImageIcon, ShoppingBag } from 'lucide-react';
import type { Order, Product } from '@/shared/domain/types';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { buildOrderImages, itemThumbnails } from '../domain/orderImages';
import OrderImagesModal from './OrderImagesModal';

interface Props {
  order: Order;
  productsById?: Map<string, Product>;
}

const tag = 'rounded-md border border-[#EEEEEE] bg-[#FAF9F6] px-2.5 py-1 text-[11px] font-medium text-black';

export default function OrderItemsPanel({ order, productsById }: Props) {
  const [showImages, setShowImages] = useState(false);

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
          const thumbs = itemThumbnails(item.productId, productsById);
          return (
            <div key={idx} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
              <div className="flex shrink-0 gap-2">
                {item.image ? (
                  <img
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
                      <img
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
                  {item.selectedVariant && <span className={tag}>{item.selectedVariant.name}</span>}
                  {item.selectedSize && <span className={tag}>Size: {item.selectedSize}</span>}
                  <span className={tag}>Qty: {item.quantity}</span>
                </div>
              </div>
              <span className="font-mono text-sm font-bold text-black">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          );
        })}
      </div>
      {showImages && <OrderImagesModal images={buildOrderImages(order, productsById)} onClose={() => setShowImages(false)} />}
    </section>
  );
}
