'use client';

import { useCallback, useEffect, useState } from 'react';
import type { GalleryArtwork } from '../domain/gallery';
import { fetchActiveGallery } from '../infrastructure/galleryRepository';

// The first successful fetch is kept in module memory so reopening the panel or switching studios does not refetch.
let cached: GalleryArtwork[] | null = null;
let inflight: Promise<GalleryArtwork[]> | null = null;

function load(force: boolean): Promise<GalleryArtwork[]> {
  if (cached && !force) return Promise.resolve(cached);
  if (!inflight || force) {
    const p = fetchActiveGallery().then(
      (items) => {
        cached = items;
        if (inflight === p) inflight = null;
        return items;
      },
      (err) => {
        if (inflight === p) inflight = null;
        throw err;
      },
    );
    inflight = p;
  }
  return inflight;
}

export function useGallery() {
  const [items, setItems] = useState<GalleryArtwork[]>(() => cached ?? []);
  const [loading, setLoading] = useState(() => cached === null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback((force: boolean, isActive: () => boolean) => {
    if (!cached || force) setLoading(true);
    setError(null);
    load(force).then(
      (next) => {
        if (!isActive()) return;
        setItems(next);
        setLoading(false);
      },
      () => {
        if (!isActive()) return;
        setError('Could not load the gallery. Please try again.');
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    let active = true;
    run(false, () => active);
    return () => {
      active = false;
    };
  }, [run]);

  const reload = useCallback(() => run(true, () => true), [run]);

  return { items, loading, error, reload };
}
