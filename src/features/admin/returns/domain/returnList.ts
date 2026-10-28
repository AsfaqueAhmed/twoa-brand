import type { OrderReturn, ReturnStatus } from './orderReturn';

export type ReturnStatusFilter = '' | ReturnStatus;

export interface ReturnFilters {
  search: string;
  status: ReturnStatusFilter;
}

export const DEFAULT_RETURN_FILTERS: ReturnFilters = { search: '', status: '' };

/** Short display id, e.g. `#abcd1234`. */
export function shortOrderId(orderId: string): string {
  return `#${orderId.slice(-8)}`;
}

export function filterReturns(returns: OrderReturn[], f: ReturnFilters): OrderReturn[] {
  const q = f.search.trim().replace(/^#/, '').toLowerCase();
  return returns.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (q && !r.orderId.toLowerCase().includes(q) && !r.reason.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function activeReturnFilterCount(f: ReturnFilters): number {
  return (f.search.trim() ? 1 : 0) + (f.status ? 1 : 0);
}

export function returnStats(returns: OrderReturn[]): Record<ReturnStatus, number> {
  const counts: Record<ReturnStatus, number> = { requested: 0, approved: 0, rejected: 0, refunded: 0 };
  for (const r of returns) counts[r.status]++;
  return counts;
}
