import { describe, it, expect } from 'vitest';
import { NEXT_RETURN_STATUSES, resolveOrderByNumber } from './orderReturn';

describe('NEXT_RETURN_STATUSES', () => {
  it('requested can be approved or rejected', () => expect(NEXT_RETURN_STATUSES('requested')).toEqual(['approved', 'rejected']));
  it('approved can be refunded', () => expect(NEXT_RETURN_STATUSES('approved')).toEqual(['refunded']));
  it('rejected and refunded are terminal', () => {
    expect(NEXT_RETURN_STATUSES('rejected')).toEqual([]);
    expect(NEXT_RETURN_STATUSES('refunded')).toEqual([]);
  });
});

describe('resolveOrderByNumber', () => {
  const orders = [{ id: 'abc123456789' }, { id: 'zzz123456789' }, { id: 'qqq987654321' }];
  it('matches exact id', () => expect(resolveOrderByNumber(orders, 'abc123456789')).toEqual({ order: orders[0] }));
  it('matches unique suffix', () => expect(resolveOrderByNumber(orders, '987654321')).toEqual({ order: orders[2] }));
  it('rejects ambiguous suffix', () => expect(resolveOrderByNumber(orders, '123456789')).toHaveProperty('error', AMBIGUOUS));
  it('rejects too-short input', () => expect(resolveOrderByNumber(orders, '321')).toHaveProperty('error', AMBIGUOUS));
  it('rejects empty input', () => expect(resolveOrderByNumber(orders, '  ')).toHaveProperty('error'));
  it('strips a leading #', () => expect(resolveOrderByNumber(orders, '#987654321')).toEqual({ order: orders[2] }));
  it('reports no match', () => expect(resolveOrderByNumber(orders, 'nomatch1')).toEqual({ error: 'No order matches that number.' }));
});
const AMBIGUOUS = 'Ambiguous or too short — enter more of the order number';
