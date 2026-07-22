'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import type { Product } from '@/shared/domain/types';
import ProductDetailView from './ProductDetailView';

export default function ProductDetailModal({ product }: { product: Product }) {
  const router = useRouter();
  const onClose = () => router.back();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="relative w-full max-w-3xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto md:overflow-hidden rounded-none border border-[#EEEEEE] bg-[#FDFDFD] shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 rounded-none border border-[#EEEEEE] bg-white/95 backdrop-blur-xs p-2 text-black hover:bg-black hover:text-white hover:border-black transition-all duration-200 shadow-sm"
          >
            <X className="h-4 w-4" />
          </button>
          <ProductDetailView product={product} mode="modal" />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
