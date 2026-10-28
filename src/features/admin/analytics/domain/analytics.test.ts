// src/features/admin/analytics/domain/analytics.test.ts
import { describe, it, expect } from 'vitest';
import type { Order, Product } from '@/shared/domain/types';
import {
  lastNDays, previousRange, filterOrdersByRange, percentChange, computeStats, countByStatus,
  dailySales, topProducts, buildCustomers, lowStockProducts, recentActivity, formatRelativeTime, customerInsights, customerKey,
} from './analytics';

function order(over: Partial<Order> & { id: string }): Order {
  return {
    userId: 'u1', userName: 'A', userEmail: 'a@x.com', address: '', phone: '017',
    items: [{ productId: 'p1', name: 'Tee', price: 100, quantity: 2, image: 'i.png' }],
    totalAmount: 200, status: 'pending', paymentMethod: 'cash_on_delivery',
    createdAt: '2026-10-27T10:00:00', updatedAt: '2026-10-27T10:00:00', ...over,
  };
}
const now = new Date('2026-10-27T12:00:00');

describe('ranges', () => {
  it('lastNDays covers n local days ending today', () => {
    const r = lastNDays(7, now);
    expect(r.from.getDate()).toBe(21);
    expect(r.to.getDate()).toBe(27);
  });
  it('previousRange is the same length immediately before', () => {
    const p = previousRange(lastNDays(7, now));
    expect(p.to.getDate()).toBe(20);
    expect(p.from.getDate()).toBe(14);
  });
  it('filterOrdersByRange is inclusive of both ends', () => {
    const r = lastNDays(1, now);
    const orders = [order({ id: 'a' }), order({ id: 'b', createdAt: '2026-10-26T23:59:00' })];
    expect(filterOrdersByRange(orders, r).map((o) => o.id)).toEqual(['a']);
  });
});

describe('percentChange', () => {
  it('computes rounded percent', () => expect(percentChange(112, 100)).toBe(12));
  it('is null when previous is 0', () => expect(percentChange(5, 0)).toBeNull());
});

describe('computeStats', () => {
  it('excludes cancelled from sales and products sold, counts new customers by first order', () => {
    const orders = [
      order({ id: 'a' }),
      order({ id: 'b', userId: 'u2', status: 'cancelled' }),
      order({ id: 'c', userId: 'u1', createdAt: '2026-10-01T10:00:00' }),
    ];
    const s = computeStats(orders, lastNDays(7, now));
    expect(s).toEqual({ totalOrders: 1, totalSales: 200, productsSold: 2, newCustomers: 1 });
  });
});

describe('countByStatus', () => {
  it('returns zero for absent statuses', () => {
    const c = countByStatus([order({ id: 'a' }), order({ id: 'b', status: 'delivered' })]);
    expect(c).toEqual({ pending: 1, confirmed: 0, out_for_delivery: 0, delivered: 1, cancelled: 0 });
  });
});

describe('dailySales', () => {
  it('fills every day in range, summing non-cancelled totals', () => {
    const r = lastNDays(3, now);
    const s = dailySales([order({ id: 'a' }), order({ id: 'b', status: 'cancelled' })], r);
    expect(s).toEqual([
      { date: '2026-10-25', total: 0 },
      { date: '2026-10-26', total: 0 },
      { date: '2026-10-27', total: 200 },
    ]);
  });
});

describe('topProducts', () => {
  it('aggregates by productId, sorted by units sold, skipping cancelled', () => {
    const orders = [
      order({ id: 'a' }),
      order({ id: 'b', items: [{ productId: 'p2', name: 'Hoodie', price: 300, quantity: 5, image: 'h.png' }] }),
      order({ id: 'c', status: 'cancelled', items: [{ productId: 'p3', name: 'X', price: 1, quantity: 99, image: '' }] }),
    ];
    const t = topProducts(orders, 5);
    expect(t.map((p) => p.productId)).toEqual(['p2', 'p1']);
    expect(t[0]).toMatchObject({ sold: 5, revenue: 1500 });
  });
});

describe('buildCustomers', () => {
  it('groups by userId and sorts by total spent', () => {
    const c = buildCustomers([
      order({ id: 'a' }),
      order({ id: 'b', totalAmount: 50, createdAt: '2026-10-28T10:00:00' }),
      order({ id: 'c', userId: 'u2', userName: 'B', totalAmount: 900 }),
    ]);
    expect(c.map((x) => x.key)).toEqual(['u2', 'u1']);
    expect(c[1]).toMatchObject({ orderCount: 2, totalSpent: 250, firstOrderAt: '2026-10-27T10:00:00', lastOrderAt: '2026-10-28T10:00:00' });
  });
});

describe('lowStockProducts', () => {
  const p = (id: string, stock?: Record<string, number>): Product => ({
    id, name: id, description: '', price: 1, image: `${id}.png`, category: 'c', rating: 0,
    parentProduct: stock ? { id: 'pp', name: 'pp', category: '', sizeOrder: Object.keys(stock), stockBySize: stock } : undefined,
  });
  it('sums sizes, filters by threshold, sorts ascending, skips no-parent', () => {
    const r = lowStockProducts([p('a', { S: 5, M: 5 }), p('b', { S: 3 }), p('c', { S: 50 }), p('d')], 10, 5);
    expect(r.map((x) => [x.id, x.stock])).toEqual([['b', 3], ['a', 10]]);
  });
});

describe('recentActivity', () => {
  it('emits order + status events newest first', () => {
    const orders = [
      order({ id: 'ord_aaaaaaaa11111111', createdAt: '2026-10-27T09:00:00', updatedAt: '2026-10-27T11:00:00', status: 'out_for_delivery' }),
    ];
    const ev = recentActivity(orders, 5);
    expect(ev.map((e) => e.kind)).toEqual(['status', 'order']);
    expect(ev[0].title).toBe('Order status updated to Out for Delivery');
    expect(ev[0].detail).toBe('#11111111');
  });
});

describe('formatRelativeTime', () => {
  it('formats minutes, hours, days', () => {
    expect(formatRelativeTime('2026-10-27T11:50:00', now)).toBe('10 mins ago');
    expect(formatRelativeTime('2026-10-27T09:00:00', now)).toBe('3 hours ago');
    expect(formatRelativeTime('2026-10-25T12:00:00', now)).toBe('2 days ago');
  });
});

describe('customerInsights', () => {
  it('splits new vs returning within the range and lists top spenders', () => {
    const orders = [
      order({ id: 'a', userId: 'u1', createdAt: '2026-10-01T10:00:00', totalAmount: 100 }),
      order({ id: 'b', userId: 'u1', createdAt: '2026-10-27T10:00:00', totalAmount: 100 }),
      order({ id: 'c', userId: 'u2', createdAt: '2026-10-26T10:00:00', totalAmount: 500 }),
    ];
    const r = customerInsights(orders, lastNDays(7, now));
    expect(r.newCustomers).toBe(1);
    expect(r.returningCustomers).toBe(1);
    expect(r.topSpenders[0].key).toBe('u2');
  });
});

describe('guest customers', () => {
  const g = (id: string, phone: string, over: Partial<Order> = {}) =>
    order({ id, userId: 'guest', phone, userEmail: '', ...over });

  it('customerKey uses userId for registered and phone for guests', () => {
    expect(customerKey(order({ id: 'a' }))).toBe('u1');
    expect(customerKey(g('b', '018'))).toBe('guest:018');
  });
  it('buildCustomers splits guests with different phones', () => {
    expect(buildCustomers([g('a', '017'), g('b', '018')])).toHaveLength(2);
  });
  it('buildCustomers merges guests with the same phone', () => {
    const c = buildCustomers([g('a', '017'), g('b', '017')]);
    expect(c).toHaveLength(1);
    expect(c[0].orderCount).toBe(2);
  });
  it('computeStats newCustomers counts distinct guest phones', () => {
    const s = computeStats([g('a', '017'), g('b', '018'), g('c', '017')], lastNDays(7, now));
    expect(s.newCustomers).toBe(2);
  });
  it('customerInsights ignores customers whose only in-range order is cancelled', () => {
    const r = customerInsights([order({ id: 'a', status: 'cancelled' })], lastNDays(7, now));
    expect(r.newCustomers).toBe(0);
    expect(r.returningCustomers).toBe(0);
    expect(r.topSpenders).toHaveLength(0);
  });
});
