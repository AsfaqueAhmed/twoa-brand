import { describe, it, expect } from 'vitest';
import type { CustomerSummary } from '@/features/admin/analytics/domain/analytics';
import { type CustomerSort, DEFAULT_CUSTOMER_FILTERS, activeCustomerFilterCount, customerInitials, customerStats, filterCustomers, isGuestCustomer } from './customerList';

const c = (o: Partial<CustomerSummary>): CustomerSummary => ({
  key: 'user:1', name: 'Ann Lee', email: 'ann@x.com', phone: '0170', orderCount: 1, totalSpent: 100,
  firstOrderAt: '2026-01-01T00:00:00Z', lastOrderAt: '2026-01-01T00:00:00Z', ...o,
});
const list = [
  c({ key: 'u1', name: 'Bob', email: 'bob@x.com', phone: '111', orderCount: 3, totalSpent: 300, lastOrderAt: '2026-03-01T00:00:00Z' }),
  c({ key: 'guest:2', name: 'Zed Guest', email: '', phone: '222', orderCount: 1, totalSpent: 500, lastOrderAt: '2026-02-01T00:00:00Z' }),
  c({ key: 'u3', name: 'Amy', email: 'amy@x.com', phone: '333', orderCount: 2, totalSpent: 100, lastOrderAt: '2026-04-01T00:00:00Z' }),
];

describe('customerList', () => {
  it('detects guests', () => {
    expect(isGuestCustomer(list[1])).toBe(true);
    expect(isGuestCustomer(list[0])).toBe(false);
  });
  it('initials', () => {
    expect(customerInitials('ann lee')).toBe('AL');
    expect(customerInitials('Bob')).toBe('B');
    expect(customerInitials('  ')).toBe('?');
  });
  it('initials handle multiple spaces and 3+ words (first + last)', () => {
    expect(customerInitials('ann    lee')).toBe('AL');
    expect(customerInitials('  ann   marie   lee ')).toBe('AL');
  });
  it('initials handle non-Latin and astral names', () => {
    expect(customerInitials('山田 太郎')).toBe('山太');
    expect(customerInitials('علي أحمد')).toBe('عأ');
    expect(customerInitials('😀 Smile')).toBe('😀S');
    expect(customerInitials('𝒜lice')).toBe('𝒜');
  });
  it('whitespace-only search does not filter', () => {
    expect(filterCustomers(list, { ...DEFAULT_CUSTOMER_FILTERS, search: '   ' })).toHaveLength(3);
    expect(activeCustomerFilterCount({ ...DEFAULT_CUSTOMER_FILTERS, search: '   ' })).toBe(0);
  });
  it('searches name, email, phone', () => {
    expect(filterCustomers(list, { ...DEFAULT_CUSTOMER_FILTERS, search: 'amy@' }).map((x) => x.key)).toEqual(['u3']);
    expect(filterCustomers(list, { ...DEFAULT_CUSTOMER_FILTERS, search: '222' }).map((x) => x.key)).toEqual(['guest:2']);
  });
  it('filters by type', () => {
    expect(filterCustomers(list, { ...DEFAULT_CUSTOMER_FILTERS, type: 'guest' })).toHaveLength(1);
    expect(filterCustomers(list, { ...DEFAULT_CUSTOMER_FILTERS, type: 'registered' })).toHaveLength(2);
  });
  it('sorts', () => {
    const keys = (sort: CustomerSort) => filterCustomers(list, { ...DEFAULT_CUSTOMER_FILTERS, sort }).map((x) => x.key);
    expect(keys('spent-desc')).toEqual(['guest:2', 'u1', 'u3']);
    expect(keys('orders-desc')).toEqual(['u1', 'u3', 'guest:2']);
    expect(keys('latest')).toEqual(['u3', 'u1', 'guest:2']);
    expect(keys('name')).toEqual(['u3', 'u1', 'guest:2']);
  });
  it('stats', () => {
    expect(customerStats(list)).toEqual({ total: 3, repeat: 2, avgOrderValue: 900 / 6, revenue: 900 });
    expect(customerStats([]).avgOrderValue).toBe(0);
  });
  it('counts active filters', () => {
    expect(activeCustomerFilterCount(DEFAULT_CUSTOMER_FILTERS)).toBe(0);
    expect(activeCustomerFilterCount({ search: 'a', type: 'guest', sort: 'name' })).toBe(3);
  });
});
