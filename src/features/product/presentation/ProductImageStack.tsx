'use client';

import { motion, AnimatePresence, type PanInfo } from 'motion/react';
import { resolveSwipeNavigation } from '../domain/swipeThreshold';

interface ProductImageStackProps {
  image: string;
  alt: string;
  category: string;
  previousImage?: string;
  nextImage?: string;
  onNavigate?: (offset: 1 | -1) => void;
  positionLabel?: { index: number; total: number };
  navKey: string;
}

export default function ProductImageStack({
  image,
  alt,
  category,
  previousImage,
  nextImage,
  onNavigate,
  positionLabel,
  navKey,
}: ProductImageStackProps) {
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!onNavigate) return;
    const direction = resolveSwipeNavigation(info.offset.x, info.velocity.x);
    if (direction) onNavigate(direction);
  };

  return (
    <div className="relative h-full w-full overflow-hidden" id="product-image-stack">
      {previousImage && (
        <img
          src={previousImage}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="absolute inset-y-3 left-0 w-full -translate-x-3 scale-95 object-cover opacity-50"
        />
      )}
      {nextImage && (
        <img
          src={nextImage}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="absolute inset-y-3 left-0 w-full translate-x-3 scale-95 object-cover opacity-50"
        />
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={navKey}
          className="absolute inset-2 border border-black/10 bg-[#F5F5F5] shadow-lg"
          drag={onNavigate ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.5}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.2 }}
        >
          <img src={image} alt={alt} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        </motion.div>
      </AnimatePresence>
      <span className="absolute top-4 left-4 z-10 bg-black px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white">
        {category}
      </span>
      {positionLabel && (
        <span className="absolute bottom-4 right-4 z-10 bg-white/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-black">
          {positionLabel.index} of {positionLabel.total}
        </span>
      )}
    </div>
  );
}
