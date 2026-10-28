import { describe, it, expect } from 'vitest';
import {
  MAX_PARENT_IMAGES,
  MAX_IMAGE_TITLE_LENGTH,
  parseParentImages,
  sanitizeParentImages,
  getParentImages,
  primaryImageUrl,
  nextImageTitle,
} from './parentImages';

describe('sanitizeParentImages', () => {
  it('trims, drops blank and duplicate URLs, and numbers untitled images by position', () => {
    const out = sanitizeParentImages([
      { title: '  ', url: ' a.jpg ' },
      { title: 'Back', url: 'b.jpg' },
      { title: 'Dup', url: 'a.jpg' },
      { title: 'Blank', url: '   ' },
      { title: '', url: 'c.jpg' },
    ]);
    expect(out).toEqual([
      { title: 'Image 1', url: 'a.jpg' },
      { title: 'Back', url: 'b.jpg' },
      { title: 'Image 3', url: 'c.jpg' },
    ]);
  });
  it('caps the count and the title length', () => {
    const many = Array.from({ length: MAX_PARENT_IMAGES + 3 }, (_, i) => ({ title: 'T'.repeat(100), url: `u${i}.jpg` }));
    const out = sanitizeParentImages(many);
    expect(out).toHaveLength(MAX_PARENT_IMAGES);
    expect(out[0].title).toHaveLength(MAX_IMAGE_TITLE_LENGTH);
  });
});

describe('parseParentImages', () => {
  it('reads a valid jsonb array and skips malformed entries', () => {
    const out = parseParentImages([{ title: 'Front', url: 'f.jpg' }, null, 'x', { title: 5, url: 'g.jpg' }, { url: '' }, { title: 'Back' }]);
    expect(out).toEqual([
      { title: 'Front', url: 'f.jpg' },
      { title: 'Image 2', url: 'g.jpg' },
    ]);
  });
  it('returns [] for non-arrays', () => {
    expect(parseParentImages(null)).toEqual([]);
    expect(parseParentImages('nope')).toEqual([]);
    expect(parseParentImages({})).toEqual([]);
  });
});

describe('getParentImages', () => {
  it('prefers the images list', () => {
    expect(getParentImages({ image: 'old.jpg', images: [{ title: 'Back', url: 'b.jpg' }] })).toEqual([{ title: 'Back', url: 'b.jpg' }]);
  });
  it('falls back to the single image as Front', () => {
    expect(getParentImages({ image: ' old.jpg ' })).toEqual([{ title: 'Front', url: 'old.jpg' }]);
    expect(getParentImages({ image: 'old.jpg', images: [] })).toEqual([{ title: 'Front', url: 'old.jpg' }]);
  });
  it('returns [] when there is nothing', () => {
    expect(getParentImages({})).toEqual([]);
    expect(getParentImages({ image: '  ' })).toEqual([]);
  });
});

describe('primaryImageUrl / nextImageTitle', () => {
  it('uses the first image', () => {
    expect(primaryImageUrl([{ title: 'A', url: 'a.jpg' }, { title: 'B', url: 'b.jpg' }])).toBe('a.jpg');
    expect(primaryImageUrl([])).toBe('');
  });
  it('suggests the first unused standard title, case-insensitively, else blank', () => {
    expect(nextImageTitle([])).toBe('Front');
    expect(nextImageTitle([{ title: 'front', url: 'a' }])).toBe('Back');
    expect(nextImageTitle([{ title: 'Front', url: 'a' }, { title: 'Back', url: 'b' }, { title: 'Left', url: 'c' }, { title: 'Right', url: 'd' }])).toBe('');
  });
});
