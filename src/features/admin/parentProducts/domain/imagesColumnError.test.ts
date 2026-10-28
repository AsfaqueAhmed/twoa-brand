import { describe, it, expect } from 'vitest';
import { isMissingImagesColumnError } from './imagesColumnError';

describe('isMissingImagesColumnError', () => {
  it('detects PGRST204 mentioning images', () => {
    expect(isMissingImagesColumnError({ code: 'PGRST204', message: "Could not find the 'images' column of 'parent_products' in the schema cache" })).toBe(true);
  });
  it('rejects other codes, other columns and null', () => {
    expect(isMissingImagesColumnError({ code: '23505', message: "images duplicate" })).toBe(false);
    expect(isMissingImagesColumnError({ code: 'PGRST204', message: "Could not find the 'foo' column" })).toBe(false);
    expect(isMissingImagesColumnError(null)).toBe(false);
    expect(isMissingImagesColumnError(undefined)).toBe(false);
    expect(isMissingImagesColumnError('PGRST204 images')).toBe(false);
  });
});
