import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatCurrency';

describe('formatCurrency', () => {
  it('formats a whole number with two decimals', () => {
    expect(formatCurrency(100)).toBe('৳100.00');
  });

  it('formats a fractional number with two decimals', () => {
    expect(formatCurrency(4.9)).toBe('৳4.90');
  });

  it('rounds to two decimals', () => {
    expect(formatCurrency(4.999)).toBe('৳5.00');
  });
});
