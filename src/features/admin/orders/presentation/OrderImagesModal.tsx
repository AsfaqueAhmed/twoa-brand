'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { OrderImage } from '../domain/orderImages';

interface Props {
  images: OrderImage[];
  onClose: () => void;
}

export default function OrderImagesModal({ images, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Product images"
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-black">Product Images</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#717171] hover:bg-[#F5F5F5] hover:text-black"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {images.length === 0 ? (
          <p className="py-8 text-center text-xs text-[#717171]">No images available.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img) => (
              <figure key={img.src} className="space-y-1.5">
                <img
                  src={img.src}
                  alt={img.label}
                  className="aspect-square w-full rounded-lg border border-[#EEEEEE] bg-[#F5F5F5] object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <figcaption className="truncate text-[11px] text-[#717171]">{img.label}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
