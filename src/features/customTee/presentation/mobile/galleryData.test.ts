import { describe, expect, it } from 'vitest';
import { GALLERY_CATEGORIES, GALLERY_ITEMS, filterGalleryByCategory } from './galleryData';
import { MOBILE_FONTS } from './fonts';

describe('galleryData', () => {
  it('provides all expected categories', () => {
    expect(GALLERY_CATEGORIES).toContain('All');
    expect(GALLERY_CATEGORIES).toContain('Nature');
    expect(GALLERY_CATEGORIES).toContain('Anime');
    expect(GALLERY_CATEGORIES).toContain('Typography');
    expect(GALLERY_CATEGORIES).toContain('Vintage');
  });

  it('contains valid gallery items with valid data URLs and aspects', () => {
    expect(GALLERY_ITEMS.length).toBeGreaterThanOrEqual(8);
    for (const item of GALLERY_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.src).toMatch(/^data:image\/svg\+xml/);
      expect(item.aspect).toBeGreaterThan(0);
    }
  });

  it('filters gallery items correctly by category', () => {
    const all = filterGalleryByCategory('All');
    expect(all.length).toBe(GALLERY_ITEMS.length);

    const nature = filterGalleryByCategory('Nature');
    expect(nature.length).toBeGreaterThan(0);
    expect(nature.every((i) => i.category === 'Nature')).toBe(true);
  });
});

describe('fonts', () => {
  it('provides Bengali and Latin fonts', () => {
    expect(MOBILE_FONTS.some((f) => f.script === 'bengali')).toBe(true);
    expect(MOBILE_FONTS.some((f) => f.script === 'latin')).toBe(true);
    expect(MOBILE_FONTS.some((f) => f.label.includes('Noto Sans Bengali'))).toBe(true);
    expect(MOBILE_FONTS.some((f) => f.label.includes('Hind Siliguri'))).toBe(true);
  });
});
