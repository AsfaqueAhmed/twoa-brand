'use client';

import type { ImgHTMLAttributes } from 'react';
import { thumbnailUrl } from '@/shared/lib/imageUrls';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string | null };

// Renders the small `.thumb.webp` sibling of an uploaded image and falls back
// once to the original URL if the thumbnail is missing. Legacy URLs pass through.
export function ThumbImage({ src, alt = '', loading = 'lazy', decoding = 'async', onError, ...rest }: Props) {
  const original = src ?? '';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={thumbnailUrl(original)}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onError={(e) => {
        const img = e.currentTarget;
        if (original && img.getAttribute('src') !== original) img.src = original;
        onError?.(e);
      }}
    />
  );
}
