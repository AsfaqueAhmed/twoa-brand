import type { HomeBanner } from '@/features/catalog/domain/banner';

export type BannerStatusFilter = '' | 'live' | 'hidden';

export interface BannerFilters {
  search: string;
  status: BannerStatusFilter;
}

export const DEFAULT_BANNER_FILTERS: BannerFilters = { search: '', status: '' };

/** A banner is shown on the home page only while its active flag is on. */
export function isBannerLive(banner: Pick<HomeBanner, 'isActive'>): boolean {
  return banner.isActive;
}

export function hasBannerLink(banner: Pick<HomeBanner, 'ctaHref'>): boolean {
  return banner.ctaHref.trim() !== '';
}

export function filterBanners(banners: HomeBanner[], f: BannerFilters): HomeBanner[] {
  const q = f.search.trim().toLowerCase();
  return banners.filter((b) => {
    if (q && !b.headline.toLowerCase().includes(q)) return false;
    if (f.status === 'live' && !isBannerLive(b)) return false;
    if (f.status === 'hidden' && isBannerLive(b)) return false;
    return true;
  });
}

export function activeBannerFilterCount(f: BannerFilters): number {
  return (f.search.trim() ? 1 : 0) + (f.status ? 1 : 0);
}

export function bannerStats(banners: HomeBanner[]) {
  const live = banners.filter(isBannerLive).length;
  return {
    total: banners.length,
    live,
    hidden: banners.length - live,
    withLink: banners.filter(hasBannerLink).length,
  };
}
