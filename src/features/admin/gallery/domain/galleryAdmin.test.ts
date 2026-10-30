import { describe, expect, it } from 'vitest';
import {
  GALLERY_MAX_BYTES,
  clampGalleryAspect,
  distinctCategories,
  galleryObjectPath,
  nextSortOrder,
  normalizeCategory,
  titleFromFileName,
  toAdminGalleryItem,
  validateGalleryFile,
  type AdminGalleryItem,
} from './galleryAdmin';

const item = (over: Partial<AdminGalleryItem>): AdminGalleryItem => ({
  id: 'ga_1',
  title: 'T',
  category: 'General',
  imagePath: 'art/a.png',
  imageUrl: 'u',
  aspect: 1,
  sortOrder: 0,
  active: true,
  createdAt: '2026-01-01',
  ...over,
});

describe('validateGalleryFile', () => {
  it('accepts png, jpeg and webp up to 25 MB', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
      expect(validateGalleryFile({ type, size: GALLERY_MAX_BYTES })).toBeNull();
    }
  });
  it('rejects other types and oversized files', () => {
    expect(validateGalleryFile({ type: 'image/gif', size: 10 })).toMatch(/PNG, JPG or WebP/);
    expect(validateGalleryFile({ type: 'image/svg+xml', size: 10 })).toMatch(/PNG, JPG or WebP/);
    expect(validateGalleryFile({ type: 'image/png', size: GALLERY_MAX_BYTES + 1 })).toMatch(/25 MB/);
  });
});

describe('titleFromFileName', () => {
  it('drops the extension and turns separators into spaces', () => {
    expect(titleFromFileName('stay-wild_mountain.png')).toBe('stay wild mountain');
    expect(titleFromFileName('  Great   Wave .final.webp')).toBe('Great Wave .final');
  });
  it('falls back to Untitled and caps the length', () => {
    expect(titleFromFileName('.png')).toBe('Untitled');
    expect(titleFromFileName(`${'a'.repeat(150)}.png`)).toHaveLength(100);
  });
});

describe('galleryObjectPath', () => {
  it('stores under art/<uuid>.<ext> by mime type', () => {
    expect(galleryObjectPath('abc', 'image/png')).toBe('art/abc.png');
    expect(galleryObjectPath('abc', 'image/jpeg')).toBe('art/abc.jpg');
    expect(galleryObjectPath('abc', 'image/webp')).toBe('art/abc.webp');
  });
});

describe('normalizeCategory', () => {
  it('trims, defaults to General and caps at 40 characters', () => {
    expect(normalizeCategory('  Nature ')).toBe('Nature');
    expect(normalizeCategory('   ')).toBe('General');
    expect(normalizeCategory('x'.repeat(60))).toHaveLength(40);
  });
});

describe('distinctCategories', () => {
  it('lists each category once, alphabetically', () => {
    const items = [item({ category: 'Vintage' }), item({ category: 'Anime' }), item({ category: 'Vintage' })];
    expect(distinctCategories(items)).toEqual(['Anime', 'Vintage']);
  });
});

describe('nextSortOrder', () => {
  it('is one past the highest sort order, or 0 when empty', () => {
    expect(nextSortOrder([])).toBe(0);
    expect(nextSortOrder([item({ sortOrder: 3 }), item({ sortOrder: 7 })])).toBe(8);
  });
});

describe('toAdminGalleryItem', () => {
  it('maps a row including hidden state and public URL', () => {
    expect(
      toAdminGalleryItem(
        { id: 'ga_9', title: 'Wave', category: 'Nature', image_path: 'art/x.png', aspect: '2', sort_order: 4, active: false, created_at: 'c' },
        'https://p.supabase.co',
      ),
    ).toEqual({
      id: 'ga_9',
      title: 'Wave',
      category: 'Nature',
      imagePath: 'art/x.png',
      imageUrl: 'https://p.supabase.co/storage/v1/object/public/gallery/art/x.png',
      aspect: 2,
      sortOrder: 4,
      active: false,
      createdAt: 'c',
    });
  });
});

describe('clampGalleryAspect', () => {
  it('keeps the aspect inside the database range', () => {
    expect(clampGalleryAspect(1.5)).toBe(1.5);
    expect(clampGalleryAspect(0.01)).toBe(0.06);
    expect(clampGalleryAspect(50)).toBe(19.9);
    expect(clampGalleryAspect(Number.NaN)).toBe(1);
  });
});
