export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'refunded';

export interface OrderReturn {
  id: string; orderId: string; reason: string; status: ReturnStatus; createdAt: string; updatedAt: string;
}

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: 'Requested', approved: 'Approved', rejected: 'Rejected', refunded: 'Refunded',
};

export function NEXT_RETURN_STATUSES(status: ReturnStatus): ReturnStatus[] {
  if (status === 'requested') return ['approved', 'rejected'];
  if (status === 'approved') return ['refunded'];
  return [];
}

export function resolveOrderByNumber<T extends { id: string }>(orders: T[], input: string): { order: T } | { error: string } {
  const v = input.trim().replace(/^#/, '');
  if (!v) return { error: 'Enter an order number.' };
  const exact = orders.find((o) => o.id === v);
  if (exact) return { order: exact };
  if (v.length < 6) return { error: 'Ambiguous or too short — enter more of the order number' };
  const matches = orders.filter((o) => o.id.endsWith(v));
  if (matches.length === 1) return { order: matches[0] };
  if (matches.length === 0) return { error: 'No order matches that number.' };
  return { error: 'Ambiguous or too short — enter more of the order number' };
}
