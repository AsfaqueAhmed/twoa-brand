import { describe, it, expect } from 'vitest';
import { isSafeCtaHref, isValidDesktopAspect, isValidMobileAspect, findAspectPreset, DESKTOP_ASPECT_PRESETS, MOBILE_ASPECT_PRESETS, renumberBanners, reorderBanners, nextBannerPosition, type HomeBanner } from './banner';

const make = (id: string, position: number): HomeBanner => ({
  id,
  position,
  isActive: true,
  desktopImageUrl: `${id}.jpg`,
  eyebrow: '',
  headline: id,
  subtext: '',
  ctaLabel: '',
  ctaHref: '',
  desktopAspect: 16 / 6,
  mobileAspect: 0.8,
  createdAt: '',
});

describe('isValidDesktopAspect', () => {
  it('accepts values within 1..6', () => {
    for (const n of [1, 2.6667, 4.5, 6]) expect(isValidDesktopAspect(n)).toBe(true);
  });

  it('rejects out-of-range and non-finite values', () => {
    for (const n of [0.5, 6.1, NaN, Infinity, 0, -2]) expect(isValidDesktopAspect(n)).toBe(false);
  });
});

describe('isValidMobileAspect', () => {
  it('accepts values within 0.5..2', () => {
    for (const n of [0.5, 0.8, 1, 2]) expect(isValidMobileAspect(n)).toBe(true);
  });

  it('rejects out-of-range and non-finite values', () => {
    for (const n of [0.4, 2.1, NaN, Infinity, 0, -1]) expect(isValidMobileAspect(n)).toBe(false);
  });
});

describe('findAspectPreset', () => {
  it('matches rounded values within tolerance', () => {
    expect(findAspectPreset(DESKTOP_ASPECT_PRESETS, 2.6667)?.label).toBe('16:6');
    expect(findAspectPreset(MOBILE_ASPECT_PRESETS, 0.8)?.label).toBe('4:5');
  });

  it('returns undefined when nothing matches', () => {
    expect(findAspectPreset(DESKTOP_ASPECT_PRESETS, 2.5)).toBeUndefined();
  });
});

describe('isSafeCtaHref', () => {
  it('accepts root-relative paths and https links', () => {
    expect(isSafeCtaHref('/')).toBe(true);
    expect(isSafeCtaHref('/shop?cat=tees')).toBe(true);
    expect(isSafeCtaHref('https://example.com/x')).toBe(true);
  });

  it('rejects dangerous or ambiguous links', () => {
    expect(isSafeCtaHref('javascript:alert(1)')).toBe(false);
    expect(isSafeCtaHref('data:text/html,hi')).toBe(false);
    expect(isSafeCtaHref('//evil.com')).toBe(false);
    expect(isSafeCtaHref('http://example.com')).toBe(false);
    expect(isSafeCtaHref('')).toBe(false);
    expect(isSafeCtaHref('   ')).toBe(false);
    expect(isSafeCtaHref('/\\evil.com')).toBe(false);
    expect(isSafeCtaHref('/\t/evil.com')).toBe(false);
    expect(isSafeCtaHref('/\n/evil.com')).toBe(false);
  });
});

describe('banner ordering', () => {
  const list = [make('a', 0), make('b', 1), make('c', 2)];

  it('renumberBanners assigns positions 0..n-1 in array order', () => {
    const shuffled = [make('c', 9), make('a', 4)];
    expect(renumberBanners(shuffled).map((b) => [b.id, b.position])).toEqual([['c', 0], ['a', 1]]);
  });

  it('reorderBanners moves an item forward', () => {
    expect(reorderBanners(list, 0, 2).map((b) => [b.id, b.position])).toEqual([['b', 0], ['c', 1], ['a', 2]]);
  });

  it('reorderBanners moves an item backward', () => {
    expect(reorderBanners(list, 2, 0).map((b) => [b.id, b.position])).toEqual([['c', 0], ['a', 1], ['b', 2]]);
  });

  it('reorderBanners with same index or out-of-range from index keeps order', () => {
    expect(reorderBanners(list, 1, 1).map((b) => b.id)).toEqual(['a', 'b', 'c']);
    expect(reorderBanners(list, 7, 0).map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('reorderBanners does not mutate the input', () => {
    reorderBanners(list, 0, 2);
    expect(list.map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('nextBannerPosition is max+1, or 0 for an empty list', () => {
    expect(nextBannerPosition([])).toBe(0);
    expect(nextBannerPosition([make('a', 0), make('b', 5)])).toBe(6);
  });
});
