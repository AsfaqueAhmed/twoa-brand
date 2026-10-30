import { describe, it, expect } from 'vitest';
import {
  checkoutContentIds,
  checkoutDesigns,
  checkoutHeading,
  customOrderPieces,
  customOrderSubtotal,
  describeLines,
  parseQuoteCheckout,
} from './customOrder';

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
    expect(q.extras).toEqual([]);
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

const extra = {
  id: 'CQ-EXTR0001',
  parentProductId: 'p2',
  parentName: 'Black Tshirt',
  teeSize: 'L',
  colorName: null,
  lines: [{ size: 'L', qty: 1 }],
  unitPrice: '500',
  previews: [{ viewId: 'view-0', label: 'Front', path: 'quotes/CQ-EXTR0001/preview-view-0.png' }],
};

describe('combined designs', () => {
  it('parses extras', () => {
    const q = parseQuoteCheckout({ ...raw, extras: [extra] })!;
    expect(q.extras).toHaveLength(1);
    expect(q.extras[0]).toMatchObject({ id: 'CQ-EXTR0001', unitPrice: 500, parentProductId: 'p2', colorName: undefined });
  });
  it('treats a missing or non-array extras as none', () => {
    expect(parseQuoteCheckout({ ...raw, extras: null })!.extras).toEqual([]);
    expect(parseQuoteCheckout({ ...raw, extras: 'x' })!.extras).toEqual([]);
  });
  it('rejects the whole checkout if an extra is malformed (the totals would not match the order)', () => {
    expect(parseQuoteCheckout({ ...raw, extras: [{ ...extra, unitPrice: 0 }] })).toBeNull();
    expect(parseQuoteCheckout({ ...raw, extras: [{ ...extra, lines: [] }] })).toBeNull();
    expect(parseQuoteCheckout({ ...raw, extras: [null] })).toBeNull();
  });
  it('sums lead and extras', () => {
    const q = parseQuoteCheckout({ ...raw, extras: [extra, { ...extra, id: 'CQ-EXTR0002' }] })!;
    expect(customOrderSubtotal(q)).toBe(3250 + 500 + 500);
    expect(customOrderPieces(q)).toBe(7);
    expect(checkoutDesigns(q).map((d) => d.id)).toEqual(['CQ-ABCD2345', 'CQ-EXTR0001', 'CQ-EXTR0002']);
  });
  it('builds the heading and pixel content ids', () => {
    const single = parseQuoteCheckout(raw)!;
    expect(checkoutHeading(single)).toBe('Quote CQ-ABCD2345');
    expect(checkoutContentIds(single)).toEqual(['p1']);
    const q = parseQuoteCheckout({ ...raw, extras: [extra, { ...extra, id: 'CQ-EXTR0002' }, { ...extra, id: 'CQ-EXTR0003', parentProductId: 'p1' }] })!;
    expect(checkoutHeading(q)).toBe('Quote CQ-ABCD2345 and 3 more designs');
    expect(checkoutHeading({ ...q, extras: q.extras.slice(0, 1) })).toBe('Quote CQ-ABCD2345 and 1 more design');
    expect(checkoutContentIds(q)).toEqual(['p1', 'p2']);
    expect(checkoutContentIds({ ...single, parentProductId: '' })).toEqual(['CQ-ABCD2345']);
  });
});
