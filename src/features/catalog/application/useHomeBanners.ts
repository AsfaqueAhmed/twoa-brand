'use client';

import { useEffect, useState } from 'react';
import type { HomeBanner } from '../domain/banner';
import { fetchActiveBanners } from '../infrastructure/homeBannersRepository';

// A banner failure must never break the home page, so errors resolve to [].
export function useHomeBanners(): { banners: HomeBanner[]; loading: boolean } {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchActiveBanners()
      .then((rows) => !cancelled && setBanners(rows))
      .catch(() => !cancelled && setBanners([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { banners, loading };
}
