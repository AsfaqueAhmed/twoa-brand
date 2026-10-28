import { describe, it, expect } from 'vitest';
import { categorySlug } from './categorySlug';

describe('categorySlug', () => {
  it('normalises case and separators', () => {
    expect(categorySlug('T-Shirt')).toBe('t-shirt');
    expect(categorySlug('T Shirt')).toBe('t-shirt');
  });
  it('returns empty for names without letters or numbers', () => {
    expect(categorySlug('!!!')).toBe('');
  });
});
