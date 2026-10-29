import { describe, it, expect } from 'vitest';
import { customOrderSubtotal, describeLines, parseQuoteCheckout } from './customOrder';

const raw = {
  id: 'CQ-ABCD2345',
  name: 'Rahim',
  phone: '01711223344',
  parentProductId: 'p1',
  parentName: 'Forest Green Tshirt',
  teeSize: 'M',
  colorName: 'Green',
  lines: [{ size: 'M', qty: 3 }, { size: 'L', qty: 2 }],
  unitPrice: 650,
  previews: [{ viewId: 'view-0', label: 'Front', path: 'quotes/CQ-ABCD2345/preview-view-0.png' }],
  expiresAt: '2026-11-05T00:00:00Z',
};

describe('parseQuoteCheckout', () => {
  it('reads a valid payload', () => {
    const q = parseQuoteCheckout(raw)!;
    expect(q.id).toBe('CQ-ABCD2345');
    expect(q.unitPrice).toBe(650);
    expect(q.lines).toHaveLength(2);
    expect(q.colorName).toBe('Green');
  });
  it('returns null for null, junk, or unpriced payloads', () => {
    expect(parseQuoteCheckout(null)).toBeNull();
    expect(parseQuoteCheckout('x')).toBeNull();
    expect(parseQuoteCheckout({ ...raw, unitPrice: null })).toBeNull();
    expect(parseQuoteCheckout({ ...raw, lines: [] })).toBeNull();
  });
  it('drops malformed lines and previews', () => {
    const q = parseQuoteCheckout({ ...raw, lines: [{ size: 'M', qty: 2 }, { size: 5 }, null], previews: [null, { path: 1 }] })!;
    expect(q.lines).toEqual([{ size: 'M', qty: 2 }]);
    expect(q.previews).toEqual([]);
  });
});

describe('totals', () => {
  it('computes the subtotal and describes lines', () => {
    const q = parseQuoteCheckout(raw)!;
    expect(customOrderSubtotal(q)).toBe(3250);
    expect(describeLines(q.lines)).toBe('M x 3, L x 2');
  });
});
