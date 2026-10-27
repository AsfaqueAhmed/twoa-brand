import { describe, it, expect } from 'vitest';
import { getGalleryImages, MAX_GALLERY_IMAGES } from './gallery';

describe('getGalleryImages', () => {
  it('puts the main image first, then the gallery in order', () => {
    expect(getGalleryImages('main.jpg', ['a.jpg', 'b.jpg'])).toEqual(['main.jpg', 'a.jpg', 'b.jpg']);
  });

  it('drops empty entries and duplicates', () => {
    expect(getGalleryImages('main.jpg', ['', 'a.jpg', 'main.jpg', 'a.jpg'])).toEqual(['main.jpg', 'a.jpg']);
  });

  it('returns only the gallery when the main image is empty', () => {
    expect(getGalleryImages('', ['a.jpg'])).toEqual(['a.jpg']);
  });

  it('handles an undefined gallery', () => {
    expect(getGalleryImages('main.jpg', undefined)).toEqual(['main.jpg']);
    expect(getGalleryImages('', undefined)).toEqual([]);
  });

  it('caps the gallery at MAX_GALLERY_IMAGES extra images', () => {
    const many = Array.from({ length: MAX_GALLERY_IMAGES + 4 }, (_, i) => `g${i}.jpg`);
    expect(getGalleryImages('main.jpg', many)).toHaveLength(MAX_GALLERY_IMAGES + 1);
  });
});
