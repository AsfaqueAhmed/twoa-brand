import { describe, it, expect } from 'vitest';
import {
  buildQuoteLink,
  buildZipPlan,
  effectiveStatus,
  quoteMessage,
  quoteReadme,
  quoteTotals,
  validateQuotePricing,
  whatsappUrl,
  type CustomQuote,
} from './customQuote';

const quote: CustomQuote = {
  id: 'CQ-ABCD2345',
  name: 'Rahim Uddin',
  phone: '01711223344',
  whatsapp: '+8801711223344',
  parentProductId: 'p1',
  parentName: 'Forest Green Tshirt',
  teeSize: 'M',
  colorName: 'Green',
  design: { layersByView: { 'view-0': [{ type: 'image', src: 'artwork:0' }, { type: 'image', src: 'artwork:1' }] } },
  files: {
    previews: [{ viewId: 'view-0', label: 'Front', path: 'quotes/CQ-ABCD2345/preview-view-0.png' }],
    artwork: [
      { name: 'artwork-1.png', path: 'quotes/CQ-ABCD2345/artwork-1.png' },
      { name: 'artwork-2.jpg', path: 'quotes/CQ-ABCD2345/artwork-2.jpg' },
    ],
  },
  status: 'quoted',
  adminNote: '',
  lines: [{ size: 'M', qty: 3 }, { size: 'L', qty: 2 }],
  unitPrice: 650,
  quoteToken: 'tok',
  quoteExpiresAt: '2026-11-05T00:00:00.000Z',
  createdAt: '2026-10-29T00:00:00.000Z',
  updatedAt: '2026-10-29T00:00:00.000Z',
};

describe('effectiveStatus', () => {
  it('turns an expired quoted quote into expired', () => {
    expect(effectiveStatus(quote, new Date('2026-11-04T00:00:00Z'))).toBe('quoted');
    expect(effectiveStatus(quote, new Date('2026-11-06T00:00:00Z'))).toBe('expired');
    expect(effectiveStatus({ ...quote, status: 'ordered' }, new Date('2030-01-01'))).toBe('ordered');
  });
});

describe('pricing', () => {
  it('computes pieces and subtotal', () => {
    expect(quoteTotals(quote.lines, 650)).toEqual({ pieces: 5, subtotal: 3250 });
    expect(quoteTotals([], 650)).toEqual({ pieces: 0, subtotal: 0 });
  });
  it('validates lines and price', () => {
    const sizes = ['M', 'L', 'XL'];
    expect(validateQuotePricing([{ size: 'M', qty: 2 }], 500, sizes)).toBeNull();
    expect(validateQuotePricing([], 500, sizes)).toMatch(/size/i);
    expect(validateQuotePricing([{ size: 'M', qty: 0 }], 500, sizes)).toMatch(/quantity/i);
    expect(validateQuotePricing([{ size: 'S', qty: 1 }], 500, sizes)).toMatch(/size/i);
    expect(validateQuotePricing([{ size: 'M', qty: 1 }, { size: 'M', qty: 2 }], 500, sizes)).toMatch(/once|duplicate/i);
    expect(validateQuotePricing([{ size: 'M', qty: 1 }], 0, sizes)).toMatch(/price/i);
  });
});

describe('links and messages', () => {
  it('builds the checkout link', () => {
    expect(buildQuoteLink('https://twoa-brand.web.app', 'a b')).toBe('https://twoa-brand.web.app/custom-order?token=a%20b');
  });
  it('builds WhatsApp URLs, adding the Bangladesh country code to local numbers', () => {
    expect(whatsappUrl('01711223344', 'Hi there')).toBe('https://wa.me/8801711223344?text=Hi%20there');
    expect(whatsappUrl('+880 1711-223344', 'x')).toBe('https://wa.me/8801711223344?text=x');
    expect(whatsappUrl('8801711223344', 'x')).toBe('https://wa.me/8801711223344?text=x');
  });
  it('writes a customer message with the link and totals', () => {
    const msg = quoteMessage(quote, 'https://x/custom-order?token=tok', new Date('2026-11-05T00:00:00Z'));
    expect(msg).toContain('Rahim Uddin');
    expect(msg).toContain('https://x/custom-order?token=tok');
    expect(msg).toContain('5');
    expect(msg).toContain('650');
  });
});

describe('zip plan', () => {
  it('lists previews, private artwork, design.json and a README', () => {
    const plan = buildZipPlan(quote);
    const paths = plan.map((e) => e.zipPath);
    expect(paths).toEqual(['previews/Front.png', 'artwork/artwork-1.png', 'artwork/artwork-2.jpg', 'design.json', 'README.txt']);
    expect(plan[0].source).toEqual({ kind: 'public', bucket: 'custom-previews', path: 'quotes/CQ-ABCD2345/preview-view-0.png' });
    expect(plan[1].source).toEqual({ kind: 'private', bucket: 'custom-artwork', path: 'quotes/CQ-ABCD2345/artwork-1.png' });
  });
  it('maps artwork references to zip file names in design.json', () => {
    const design = buildZipPlan(quote).find((e) => e.zipPath === 'design.json')!;
    expect(design.source.kind).toBe('text');
    const parsed = JSON.parse((design.source as { kind: 'text'; content: string }).content);
    expect(parsed.artworkFiles).toEqual({ 'artwork:0': 'artwork/artwork-1.png', 'artwork:1': 'artwork/artwork-2.jpg' });
    expect(parsed.design.layersByView['view-0']).toHaveLength(2);
  });
  it('writes a README with customer and tee details', () => {
    const readme = quoteReadme(quote);
    for (const needle of ['CQ-ABCD2345', 'Rahim Uddin', '01711223344', '+8801711223344', 'Forest Green Tshirt', 'M x 3', 'L x 2', '650']) {
      expect(readme).toContain(needle);
    }
  });
  it('sanitizes preview file names', () => {
    const q = { ...quote, files: { ...quote.files, previews: [{ viewId: 'view-0', label: 'Left / Sleeve?', path: 'quotes/CQ-ABCD2345/preview-view-0.png' }] } };
    expect(buildZipPlan(q)[0].zipPath).toBe('previews/Left-Sleeve.png');
  });
});
