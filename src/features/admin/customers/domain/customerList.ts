import type { CustomerSummary } from '@/features/admin/analytics/domain/analytics';

export type CustomerTypeFilter = '' | 'guest' | 'registered';
export type CustomerSort = 'spent-desc' | 'orders-desc' | 'latest' | 'name';

export interface CustomerFilters {
  search: string;
  type: CustomerTypeFilter;
  sort: CustomerSort;
}

export const DEFAULT_CUSTOMER_FILTERS: CustomerFilters = { search: '', type: '', sort: 'spent-desc' };

export function isGuestCustomer(c: Pick<CustomerSummary, 'key'>): boolean {
  return c.key.startsWith('guest:');
}

export function customerInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  // Array.from splits by code point so astral characters never become lone surrogates.
  const first = Array.from(words[0])[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : '';
  return (first + last).toUpperCase();
}

export function filterCustomers(customers: CustomerSummary[], f: CustomerFilters): CustomerSummary[] {
  const q = f.search.trim().toLowerCase();
  const rows = customers.filter((c) => {
    if (q && !`${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q)) return false;
    if (f.type === 'guest' && !isGuestCustomer(c)) return false;
    if (f.type === 'registered' && isGuestCustomer(c)) return false;
    return true;
  });
  const sorted = [...rows];
  switch (f.sort) {
    case 'orders-desc': sorted.sort((a, b) => b.orderCount - a.orderCount); break;
    case 'latest': sorted.sort((a, b) => (a.lastOrderAt < b.lastOrderAt ? 1 : a.lastOrderAt > b.lastOrderAt ? -1 : 0)); break;
    case 'name': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    default: sorted.sort((a, b) => b.totalSpent - a.totalSpent);
  }
  return sorted;
}

export function activeCustomerFilterCount(f: CustomerFilters): number {
  return (f.search.trim() ? 1 : 0) + (f.type ? 1 : 0) + (f.sort !== DEFAULT_CUSTOMER_FILTERS.sort ? 1 : 0);
}

export function customerStats(customers: CustomerSummary[]) {
  const totalOrders = customers.reduce((s, c) => s + c.orderCount, 0);
  const revenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  return {
    total: customers.length,
    repeat: customers.filter((c) => c.orderCount >= 2).length,
    avgOrderValue: totalOrders === 0 ? 0 : revenue / totalOrders,
    revenue,
  };
}
