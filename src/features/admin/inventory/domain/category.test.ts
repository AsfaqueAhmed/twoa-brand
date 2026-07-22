import { describe, it, expect } from 'vitest';
import { isValidCategoryName } from './category';

describe('isValidCategoryName', () => {
  it('rejects empty or whitespace-only names', () => {
    expect(isValidCategoryName('')).toBe(false);
    expect(isValidCategoryName('   ')).toBe(false);
  });

  it('accepts a non-empty trimmed name', () => {
    expect(isValidCategoryName('Bags')).toBe(true);
  });
});
