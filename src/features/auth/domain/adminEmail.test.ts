import { describe, it, expect } from 'vitest';
import { isAdminEmail, ADMIN_EMAIL } from './adminEmail';

describe('isAdminEmail', () => {
  it('returns true for the exact admin email', () => {
    expect(isAdminEmail(ADMIN_EMAIL)).toBe(true);
  });

  it('returns false for a different email', () => {
    expect(isAdminEmail('someone@example.com')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });
});
