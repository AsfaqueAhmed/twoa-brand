import { describe, it, expect } from 'vitest';
import type { Order } from '@/shared/domain/types';
import { shortOrderId, orderItemCount, orderBreakdown, canEditItems, deliveryZoneLabel, paymentStatus, formatPlacedOn, toggleSelected } from './orderView';

const order = (over: Partial<Order> = {}): Order => ({
  id: 'ord_fdd133de9b04b8e61a13', userId: 'guest', userName: 'A', userEmail: '', address: 'x', phone: '017',
  items: [
    { productId: 'p1', name: 'Tee', price: 320, quantity: 1, image: '' },
    { productId: 'p2', name: 'Tee2', price: 320, quantity: 1, image: '' },
  ],
  totalAmount: 710, status: 'pending', paymentMethod: 'cash_on_delivery',
  createdAt: '2026-10-27T13:49:44', updatedAt: '2026-10-27T13:49:44', ...over,
});

describe('shortOrderId', () => {
  it('returns # plus the last 8 characters', () => expect(shortOrderId('ord_fdd133de9b04b8e61a13')).toBe('#b8e61a13'));
});

describe('orderItemCount', () => {
  it('sums quantities', () => {
    expect(orderItemCount(order())).toBe(2);
    expect(orderItemCount(order({ items: [{ productId: 'p', name: 'n', price: 1, quantity: 3, image: '' }] }))).toBe(3);
  });
});

describe('orderBreakdown', () => {
  it('derives delivery fee from total, subtotal and discount', () => {
    expect(orderBreakdown(order())).toEqual({ subtotal: 640, discount: 0, deliveryFee: 70, total: 710 });
    expect(orderBreakdown(order({ discount: 100, totalAmount: 610 }))).toEqual({ subtotal: 640, discount: 100, deliveryFee: 70, total: 610 });
  });
  it('never returns a negative delivery fee', () => {
    expect(orderBreakdown(order({ totalAmount: 500 })).deliveryFee).toBe(0);
  });
});

describe('canEditItems', () => {
  it('is true only for pending and confirmed', () => {
    expect(canEditItems('pending')).toBe(true);
    expect(canEditItems('confirmed')).toBe(true);
    expect(canEditItems('out_for_delivery')).toBe(false);
    expect(canEditItems('delivered')).toBe(false);
    expect(canEditItems('cancelled')).toBe(false);
  });
});

describe('deliveryZoneLabel', () => {
  it('maps the three fixed fees and falls back to custom', () => {
    expect(deliveryZoneLabel(70)).toBe('Inside Dhaka City');
    expect(deliveryZoneLabel(110)).toBe('Dhaka Suburban');
    expect(deliveryZoneLabel(130)).toBe('Outside Dhaka');
    expect(deliveryZoneLabel(95)).toBe('Custom fee');
  });
});

describe('paymentStatus', () => {
  it('derives from order status', () => {
    expect(paymentStatus('pending')).toBe('Unpaid');
    expect(paymentStatus('confirmed')).toBe('Unpaid');
    expect(paymentStatus('out_for_delivery')).toBe('Unpaid');
    expect(paymentStatus('delivered')).toBe('Paid');
    expect(paymentStatus('cancelled')).toBe('Void');
  });
});

describe('formatPlacedOn', () => {
  it('formats day, short month, year and 12-hour time', () => {
    expect(formatPlacedOn('2026-10-27T13:49:44')).toBe('27 Oct 2026, 01:49 PM');
    expect(formatPlacedOn('2026-01-05T00:05:00')).toBe('05 Jan 2026, 12:05 AM');
  });
});

describe('toggleSelected', () => {
  it('adds, removes and never duplicates', () => {
    expect(toggleSelected([], 'a')).toEqual(['a']);
    expect(toggleSelected(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleSelected(['a'], 'b')).toEqual(['a', 'b']);
  });
});
