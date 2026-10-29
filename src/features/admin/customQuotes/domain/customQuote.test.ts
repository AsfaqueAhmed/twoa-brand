import { describe, it, expect } from 'vitest';
import {
  bundleBadge,
  bundleCandidates,
  bundleMembers,
  bundleSubtotal,
  canLeadBundle,
  phone10,
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
  it('ignores submitter-supplied artwork names and never escapes artwork/ or clobbers design.json', () => {
    const q = {
      ...quote,
      files: {
        ...quote.files,
        artwork: [
          { name: '../../design.json', path: 'quotes/CQ-ABCD2345/artwork-1.png' },
          { name: '/etc/passwd', path: 'quotes/CQ-ABCD2345/../evil/artwork-1.png' },
          { name: 'README.txt', path: '..\\..\\.hidden' },
          { name: 'x', path: '' },
        ],
      },
    };
    const plan = buildZipPlan(q);
    const paths = plan.map((e) => e.zipPath);
    expect(paths.filter((p) => p === 'design.json')).toHaveLength(1);
    expect(paths.filter((p) => p === 'README.txt')).toHaveLength(1);
    const art = paths.filter((p) => p.startsWith('artwork/'));
    expect(art).toHaveLength(4);
    expect(new Set(art.map((p) => p.toLowerCase())).size).toBe(4);
    for (const p of art) expect(p).toMatch(/^artwork\/[A-Za-z0-9_-][A-Za-z0-9._-]*$/);
    expect(art[0]).toBe('artwork/artwork-1.png');
    expect(art[1]).toBe('artwork/artwork-1-2.png');
  });
});

describe('bundles', () => {
  const mk = (id: string, patch: Partial<CustomQuote> = {}): CustomQuote => ({ ...quote, id, quoteToken: `tok-${id}`, ...patch });
  const lead = mk('CQ-LEAD0001', { createdAt: '2026-10-29T01:00:00.000Z' });
  const a = mk('CQ-AAAA0001', { phone: '+880 1711-223344', createdAt: '2026-10-29T03:00:00.000Z' });
  const b = mk('CQ-BBBB0001', { createdAt: '2026-10-29T02:00:00.000Z', mergedInto: 'CQ-LEAD0001' });
  const otherPhone = mk('CQ-OTHR0001', { phone: '01999888777' });
  const unpriced = mk('CQ-UNPR0001', { unitPrice: undefined, lines: [] });
  const newQ = mk('CQ-NEWW0001', { status: 'new' });
  const elsewhere = mk('CQ-ELSE0001', { mergedInto: 'CQ-OTHERLEAD' });
  const otherLead = mk('CQ-OTHERLEAD');
  const all = [lead, a, b, otherPhone, unpriced, newQ, elsewhere, otherLead];

  it('compares phones by the last 10 digits', () => {
    expect(phone10('+880 1711-223344')).toBe('1711223344');
    expect(phone10('01711223344')).toBe('1711223344');
  });

  it('lists members of a bundle', () => {
    expect(bundleMembers('CQ-LEAD0001', all).map((q) => q.id)).toEqual(['CQ-BBBB0001']);
    expect(bundleMembers('CQ-AAAA0001', all)).toEqual([]);
  });

  it('picks candidates: same phone, quoted, priced, not merged elsewhere, not a lead, not the lead itself', () => {
    expect(bundleCandidates(lead, all).map((q) => q.id)).toEqual(['CQ-BBBB0001', 'CQ-AAAA0001']);
  });

  it('only quoted, unmerged, priced quotes with a link can lead a bundle', () => {
    expect(canLeadBundle(lead)).toBe(true);
    expect(canLeadBundle(b)).toBe(false);
    expect(canLeadBundle(newQ)).toBe(false);
    expect(canLeadBundle(unpriced)).toBe(false);
    expect(canLeadBundle({ ...lead, quoteToken: undefined })).toBe(false);
  });

  it('labels members and leads', () => {
    expect(bundleBadge(b, all)).toBe('In combined order CQ-LEAD0001');
    expect(bundleBadge(lead, all)).toBe('Combined +1 design');
    expect(bundleBadge(otherLead, [...all, mk('CQ-X', { mergedInto: 'CQ-OTHERLEAD' })])).toBe('Combined +2 designs');
    expect(bundleBadge(a, all)).toBeNull();
  });

  it('sums the bundle subtotal', () => {
    expect(bundleSubtotal([lead, { ...b, unitPrice: 100, lines: [{ size: 'M', qty: 2 }] }])).toBe(3250 + 200);
  });

  it('writes a combined customer message listing every design', () => {
    const msg = quoteMessage(lead, 'https://x/l', new Date('2026-11-05T00:00:00Z'), [{ ...b, parentName: 'Black Tee', unitPrice: 100, lines: [{ size: 'L', qty: 1 }] }]);
    expect(msg).toContain('2 designs');
    expect(msg).toContain('Black Tee');
    expect(msg).toContain('3350');
    expect(msg).toContain('https://x/l');
  });
});
