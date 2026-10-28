import { describe, it, expect } from 'vitest';
import type { OrderReturn } from './orderReturn';
import { DEFAULT_RETURN_FILTERS, activeReturnFilterCount, filterReturns, returnStats, shortOrderId } from './returnList';

const r = (o: Partial<OrderReturn>): OrderReturn => ({
  id: 'r', orderId: 'order-aaaa1111', reason: 'Too small', status: 'requested', createdAt: '', updatedAt: '', ...o,
});
const list = [
  r({ id: '1' }),
  r({ id: '2', orderId: 'order-bbbb2222', reason: 'Damaged box', status: 'approved' }),
  r({ id: '3', orderId: 'order-cccc3333', reason: '', status: 'refunded' }),
];

describe('returnList', () => {
  it('shortens ids', () => expect(shortOrderId('order-aaaa1111')).toBe('#aaaa1111'));
  it('filters by search on order id (with #) and reason', () => {
    expect(filterReturns(list, { ...DEFAULT_RETURN_FILTERS, search: '#bbbb' }).map((x) => x.id)).toEqual(['2']);
    expect(filterReturns(list, { ...DEFAULT_RETURN_FILTERS, search: 'SMALL' }).map((x) => x.id)).toEqual(['1']);
  });
  it('filters by status', () => {
    expect(filterReturns(list, { ...DEFAULT_RETURN_FILTERS, status: 'refunded' }).map((x) => x.id)).toEqual(['3']);
  });
  it('counts statuses', () => {
    expect(returnStats(list)).toEqual({ requested: 1, approved: 1, rejected: 0, refunded: 1 });
  });
  it('counts active filters', () => {
    expect(activeReturnFilterCount(DEFAULT_RETURN_FILTERS)).toBe(0);
    expect(activeReturnFilterCount({ search: 'x', status: 'approved' })).toBe(2);
  });
});
