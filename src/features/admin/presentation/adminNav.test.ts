import { describe, it, expect } from 'vitest';
import { activeHref } from './adminNav';

describe('activeHref', () => {
  it('matches dashboard only on exact /admin', () => {
    expect(activeHref('/admin')).toBe('/admin');
  });
  it('picks the longest matching href', () => {
    expect(activeHref('/admin/coupons')).toBe('/admin/coupons');
    expect(activeHref('/admin/coupons/usage')).toBe('/admin/coupons/usage');
  });
  it('matches nested paths to their section', () => {
    expect(activeHref('/admin/orders/anything')).toBe('/admin/orders');
  });
  it('matches the categories page', () => {
    expect(activeHref('/admin/categories')).toBe('/admin/categories');
  });
  it('matches the data export page', () => {
    expect(activeHref('/admin/data-export')).toBe('/admin/data-export');
  });
  it('returns null for unknown routes', () => {
    expect(activeHref('/admin/nope')).toBeNull();
  });
});
