import { describe, expect, it } from 'vitest';
import type { HomeBanner } from '@/features/catalog/domain/banner';
import { activeBannerFilterCount, bannerStats, filterBanners, hasBannerLink } from './bannerList';

const make = (o: Partial<HomeBanner>): HomeBanner => ({
  id: 'x', position: 0, isActive: true, desktopImageUrl: '', eyebrow: '', headline: 'H', subtext: '',
  ctaLabel: '', ctaHref: '', desktopAspect: 3, mobileAspect: 1, createdAt: '', ...o,
});
const list = [
  make({ id: 'a', headline: 'Summer Sale', ctaHref: '/sale' }),
  make({ id: 'b', headline: 'Winter', isActive: false }),
  make({ id: 'c', headline: 'Eid', ctaHref: '  ' }),
];

describe('bannerList', () => {
  it('computes stats', () => {
    expect(bannerStats(list)).toEqual({ total: 3, live: 2, hidden: 1, withLink: 1 });
  });
  it('treats blank links as none', () => {
    expect(hasBannerLink(list[2])).toBe(false);
  });
  it('filters by title and status', () => {
    expect(filterBanners(list, { search: 'sum', status: '' }).map((b) => b.id)).toEqual(['a']);
    expect(filterBanners(list, { search: '', status: 'hidden' }).map((b) => b.id)).toEqual(['b']);
    expect(filterBanners(list, { search: '', status: 'live' }).map((b) => b.id)).toEqual(['a', 'c']);
  });
  it('counts active filters', () => {
    expect(activeBannerFilterCount({ search: ' ', status: '' })).toBe(0);
    expect(activeBannerFilterCount({ search: 'a', status: 'live' })).toBe(2);
  });
});
