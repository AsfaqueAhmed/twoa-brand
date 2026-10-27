import { describe, it, expect } from 'vitest';
import { normalizeNote } from './orderNote';

describe('normalizeNote', () => {
  it('trims and rejects empty notes', () => {
    expect(normalizeNote('  hi  ')).toBe('hi');
    expect(() => normalizeNote('   ')).toThrow('Note cannot be empty.');
  });
});
