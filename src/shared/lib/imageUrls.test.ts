import { describe, it, expect } from 'vitest';
import { thumbnailUrl, isThumbnailable } from './imageUrls';

const base = 'https://x.supabase.co/storage/v1/object/public/images/parent-products/p1/123';

describe('thumbnailUrl', () => {
  it('maps full to thumb', () => {
    expect(thumbnailUrl(`${base}.full.webp`)).toBe(`${base}.thumb.webp`);
  });
  it('preserves query strings', () => {
    expect(thumbnailUrl(`${base}.full.webp?v=2`)).toBe(`${base}.thumb.webp?v=2`);
  });
  it('leaves legacy images unchanged', () => {
    expect(thumbnailUrl(`${base}.jpg`)).toBe(`${base}.jpg`);
    expect(thumbnailUrl(`${base}.png`)).toBe(`${base}.png`);
  });
  it('is empty/undefined safe', () => {
    expect(thumbnailUrl('')).toBe('');
    expect(thumbnailUrl(undefined)).toBe('');
    expect(thumbnailUrl(null)).toBe('');
  });
  it('leaves data URLs unchanged', () => {
    const d = 'data:image/webp;base64,AAAA.full.webp';
    expect(thumbnailUrl(d)).toBe(d);
  });
  it('isThumbnailable', () => {
    expect(isThumbnailable(`${base}.full.webp`)).toBe(true);
    expect(isThumbnailable(`${base}.jpg`)).toBe(false);
    expect(isThumbnailable('')).toBe(false);
  });
});
