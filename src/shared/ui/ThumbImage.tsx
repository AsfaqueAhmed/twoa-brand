'use client';

import { useCallback, type ImgHTMLAttributes } from 'react';
import { thumbnailUrl } from '@/shared/lib/imageUrls';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string | null };

// Renders the small `.thumb.webp` sibling of an uploaded image and falls back
// once to the original URL if the thumbnail is missing. Legacy URLs pass through.
export function ThumbImage({ src, alt = '', loading = 'lazy', decoding = 'async', onError, ...rest }: Props) {
  const original = src ?? '';

  // A server-rendered <img> can fail before hydration, so React's onError never
  // fires. Catch that case after mount: complete + zero width means it errored.
  const ref = useCallback(
    (img: HTMLImageElement | null) => {
      if (img && original && img.complete && img.naturalWidth === 0 && img.getAttribute('src') !== original) {
        img.src = original;
      }
    },
    [original],
  );

  return (
    <img
      {...rest}
      ref={ref}
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
