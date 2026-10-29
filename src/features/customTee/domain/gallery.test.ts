import { describe, expect, it } from 'vitest';
import {
  ALL_CATEGORY,
  filterGallery,
  galleryCategories,
  galleryImageUrl,
  parseGalleryRow,
  type GalleryArtwork,
} from './gallery';

const art = (id: string, title: string, category: string): GalleryArtwork => ({
  id,
  title,
  category,
  imageUrl: `https://x.test/${id}.png`,
  aspect: 1,
});

const ITEMS = [
  art('1', 'Stay Wild Mountain', 'Nature'),
  art('2', 'Neo Tokyo', 'Anime'),
  art('3', 'Great Wave', 'Nature'),
  art('4', 'Good Vibes Only', 'Typography'),
];

describe('galleryCategories', () => {
  it('starts with All and lists each category once in order of first appearance', () => {
    expect(galleryCategories(ITEMS)).toEqual([ALL_CATEGORY, 'Nature', 'Anime', 'Typography']);
  });

  it('returns only All for an empty gallery', () => {
    expect(galleryCategories([])).toEqual(['All']);
  });
});

describe('filterGallery', () => {
  it('returns everything for All with no query', () => {
    expect(filterGallery(ITEMS, 'All', '')).toHaveLength(4);
  });

  it('filters by category', () => {
    const nature = filterGallery(ITEMS, 'Nature', '');
    expect(nature.map((i) => i.id)).toEqual(['1', '3']);
  });

  it('matches the query case-insensitively against title or category', () => {
    expect(filterGallery(ITEMS, 'All', 'TOKYO').map((i) => i.id)).toEqual(['2']);
    expect(filterGallery(ITEMS, 'All', 'typo').map((i) => i.id)).toEqual(['4']);
    expect(filterGallery(ITEMS, 'All', '  wave ').map((i) => i.id)).toEqual(['3']);
  });

  it('combines category and query', () => {
    expect(filterGallery(ITEMS, 'Nature', 'wild').map((i) => i.id)).toEqual(['1']);
    expect(filterGallery(ITEMS, 'Anime', 'wild')).toEqual([]);
  });
});

describe('galleryImageUrl', () => {
  it('builds the public storage URL for the gallery bucket', () => {
    expect(galleryImageUrl('https://abc.supabase.co/', 'art/x 1.png')).toBe(
      'https://abc.supabase.co/storage/v1/object/public/gallery/art/x%201.png',
    );
  });
});

describe('parseGalleryRow', () => {
  const base = 'https://abc.supabase.co';

  it('maps a database row to an artwork', () => {
    expect(
      parseGalleryRow({ id: 'ga_1', title: 'Wave', category: 'Nature', image_path: 'art/a.png', aspect: '1.5' }, base),
    ).toEqual({
      id: 'ga_1',
      title: 'Wave',
      category: 'Nature',
      imageUrl: 'https://abc.supabase.co/storage/v1/object/public/gallery/art/a.png',
      aspect: 1.5,
    });
  });

  it('falls back to General and a square aspect for missing or bad values', () => {
    const parsed = parseGalleryRow({ id: 'ga_2', title: 'X', category: '  ', image_path: 'art/b.png', aspect: 'nope' }, base);
    expect(parsed?.category).toBe('General');
    expect(parsed?.aspect).toBe(1);
  });

  it('rejects rows without an id, title or image path', () => {
    expect(parseGalleryRow({ id: '', title: 'X', image_path: 'a.png' }, base)).toBeNull();
    expect(parseGalleryRow({ id: 'a', title: '', image_path: 'a.png' }, base)).toBeNull();
    expect(parseGalleryRow({ id: 'a', title: 'X', image_path: '' }, base)).toBeNull();
    expect(parseGalleryRow(null, base)).toBeNull();
  });
});
