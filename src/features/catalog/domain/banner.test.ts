import { describe, it, expect } from 'vitest';
import { isSafeCtaHref, renumberBanners, reorderBanners, nextBannerPosition, type HomeBanner } from './banner';

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
  createdAt: '',
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
