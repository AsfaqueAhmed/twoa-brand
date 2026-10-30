export type QuoteStatus = 'new' | 'contacted' | 'quoted' | 'ordered' | 'declined' | 'expired';

export interface QuoteLine { size: string; qty: number }

export interface QuoteFilesRef {
  previews: { viewId: string; label: string; path: string }[];
  artwork: { name: string; path: string }[];
}

export interface CustomQuote {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  parentProductId: string;
  parentName: string;
  teeSize: string;
  colorName?: string;
  design: Record<string, any>;
  files: QuoteFilesRef;
  status: QuoteStatus;
  adminNote: string;
  lines: QuoteLine[];
  unitPrice?: number;
  quoteToken?: string;
  quoteExpiresAt?: string;
  orderId?: string;
  mergedInto?: string;
  createdAt: string;
  updatedAt: string;
}

export type ZipEntry = {
  zipPath: string;
  source:
    | { kind: 'public'; bucket: 'custom-previews'; path: string }
    | { kind: 'private'; bucket: 'custom-artwork'; path: string }
    | { kind: 'text'; content: string };
};

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  ordered: 'Ordered',
  declined: 'Declined',
  expired: 'Expired',
};

export function effectiveStatus(q: Pick<CustomQuote, 'status' | 'quoteExpiresAt'>, now: Date = new Date()): QuoteStatus {
  if (q.status === 'quoted' && q.quoteExpiresAt && new Date(q.quoteExpiresAt).getTime() < now.getTime()) return 'expired';
  return q.status;
}

export function quoteTotals(lines: QuoteLine[], unitPrice: number): { pieces: number; subtotal: number } {
  const pieces = lines.reduce((s, l) => s + l.qty, 0);
  return { pieces, subtotal: pieces * unitPrice };
}

export function validateQuotePricing(lines: QuoteLine[], unitPrice: number, validSizes: string[]): string | null {
  if (!lines.length) return 'Add at least one size with a quantity.';
  const seen = new Set<string>();
  for (const l of lines) {
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 1000) return 'Each quantity must be a whole number from 1 to 1000.';
    if (!validSizes.includes(l.size)) return `Unknown size "${l.size}".`;
    if (seen.has(l.size)) return 'Each size can only be listed once.';
    seen.add(l.size);
  }
  if (typeof unitPrice !== 'number' || !Number.isFinite(unitPrice) || unitPrice <= 0) return 'Enter a valid price per piece.';
  return null;
}

export function buildQuoteLink(origin: string, token: string): string {
  return `${origin}/custom-order?token=${encodeURIComponent(token)}`;
}

export function whatsappUrl(number: string, text: string): string {
  let digits = number.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 11) digits = '880' + digits.slice(1);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function linesSummary(lines: QuoteLine[]): string {
  return lines.map((l) => `${l.size} x ${l.qty}`).join(', ');
}

export function quoteMessage(q: CustomQuote, link: string, expiresAt: Date, members: CustomQuote[] = []): string {
  const expiry = `This link works once and expires on ${expiresAt.toLocaleDateString('en-GB')}.`;
  if (members.length === 0) {
    const { pieces, subtotal } = quoteTotals(q.lines, q.unitPrice ?? 0);
    return [
      `Hi ${q.name}, thanks for your custom tee request (${q.parentName}).`,
      `Your quote: ${pieces} pieces (${linesSummary(q.lines)}) at ${q.unitPrice ?? 0} each = ${subtotal}.`,
      `Please confirm and place your order here: ${link}`,
      expiry,
    ].join('\n');
  }
  const designs = [q, ...members];
  return [
    `Hi ${q.name}, thanks for your custom tee requests. Your quote covers ${designs.length} designs:`,
    ...designs.map((d) => {
      const { pieces, subtotal } = quoteTotals(d.lines, d.unitPrice ?? 0);
      return `- ${d.parentName}: ${pieces} pieces (${linesSummary(d.lines)}) at ${d.unitPrice ?? 0} each = ${subtotal}`;
    }),
    `Total: ${bundleSubtotal(designs)}.`,
    `Please confirm and place your order here: ${link}`,
    expiry,
  ].join('\n');
}

// --- Bundles: several quotes of one customer combined into one checkout (lead + members). ---

export const MAX_BUNDLE_MEMBERS = 10;

export function phone10(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

export function isPriced(q: Pick<CustomQuote, 'lines' | 'unitPrice'>): boolean {
  return q.lines.length > 0 && q.unitPrice != null && q.unitPrice > 0;
}

export function bundleMembers(leadId: string, quotes: CustomQuote[]): CustomQuote[] {
  return quotes
    .filter((q) => q.mergedInto === leadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function canLeadBundle(q: CustomQuote): boolean {
  return q.status === 'quoted' && !q.mergedInto && !!q.quoteToken && isPriced(q);
}

// Quotes that may be combined into `lead` (the same rules the set_custom_quote_bundle RPC enforces).
export function bundleCandidates(lead: CustomQuote, quotes: CustomQuote[]): CustomQuote[] {
  const leaders = new Set(quotes.map((q) => q.mergedInto).filter(Boolean));
  const phone = phone10(lead.phone);
  return quotes
    .filter(
      (q) =>
        q.id !== lead.id &&
        q.status === 'quoted' &&
        isPriced(q) &&
        (!q.mergedInto || q.mergedInto === lead.id) &&
        !leaders.has(q.id) &&
        phone10(q.phone) === phone,
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function bundleBadge(q: CustomQuote, quotes: CustomQuote[]): string | null {
  if (q.mergedInto) return `In combined order ${q.mergedInto}`;
  const n = quotes.filter((x) => x.mergedInto === q.id).length;
  return n > 0 ? `Combined +${n} ${n === 1 ? 'design' : 'designs'}` : null;
}

export function bundleSubtotal(designs: CustomQuote[]): number {
  return designs.reduce((s, d) => s + quoteTotals(d.lines, d.unitPrice ?? 0).subtotal, 0);
}

export function describeQuoteLines(lines: QuoteLine[]): string {
  return linesSummary(lines);
}

function sanitize(label: string): string {
  return label.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function quoteReadme(q: CustomQuote): string {
  const out: string[] = [
    `Custom tee quote ${q.id}`,
    `Created: ${new Date(q.createdAt).toLocaleDateString('en-GB')}`,
    '',
    `Customer: ${q.name}`,
    `Phone: ${q.phone}`,
    `WhatsApp: ${q.whatsapp}`,
    '',
    `Tee: ${q.parentName}`,
    `Selected size: ${q.teeSize}`,
    `Color: ${q.colorName || '-'}`,
  ];
  if (q.lines.length) {
    out.push('', 'Quantities:');
    for (const l of q.lines) out.push(`${l.size} x ${l.qty}`);
    if (q.unitPrice != null) {
      const { pieces, subtotal } = quoteTotals(q.lines, q.unitPrice);
      out.push(`Pieces: ${pieces}`, `Unit price: ${q.unitPrice}`, `Subtotal: ${subtotal}`);
    }
  }
  if (q.adminNote) out.push('', `Note: ${q.adminNote}`);
  out.push(
    '',
    'How to use these files:',
    '- previews/ holds mock-ups of each view as the customer saw it.',
    '- artwork/ holds the original images the customer uploaded.',
    '- design.json lists the exact placement of every layer per view (position, size, rotation, flips, text, font, color).',
  );
  return out.join('\n') + '\n';
}

// Safe ZIP entry name for an artwork file: basename of the storage path (never the submitter-supplied name),
// restricted charset, no leading dots, never colliding with another entry.
export function safeArtworkName(path: string, index: number, taken: Set<string>): string {
  const base = (path.split(/[\\/]/).pop() ?? '').replace(/[^A-Za-z0-9._-]/g, '').replace(/^\.+/, '').slice(0, 100);
  let name = base || `artwork-${index + 1}`;
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let n = 1;
  while (taken.has(name.toLowerCase())) name = `${stem}-${++n}${ext}`;
  taken.add(name.toLowerCase());
  return name;
}

export function buildZipPlan(q: CustomQuote): ZipEntry[] {
  const plan: ZipEntry[] = [];
  const used = new Map<string, number>();
  for (const p of q.files.previews) {
    const base = sanitize(p.label) || sanitize(p.viewId) || 'view';
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    plan.push({
      zipPath: `previews/${n === 1 ? base : `${base}-${n}`}.png`,
      source: { kind: 'public', bucket: 'custom-previews', path: p.path },
    });
  }
  const artworkFiles: Record<string, string> = {};
  const takenNames = new Set<string>();
  q.files.artwork.forEach((a, i) => {
    const entry = `artwork/${safeArtworkName(a.path, i, takenNames)}`;
    artworkFiles[`artwork:${i}`] = entry;
    plan.push({ zipPath: entry, source: { kind: 'private', bucket: 'custom-artwork', path: a.path } });
  });
  plan.push({
    zipPath: 'design.json',
    source: {
      kind: 'text',
      content: JSON.stringify(
        { quoteId: q.id, parentProductId: q.parentProductId, teeSize: q.teeSize, colorName: q.colorName, design: q.design, artworkFiles },
        null,
        2,
      ),
    },
  });
  plan.push({ zipPath: 'README.txt', source: { kind: 'text', content: quoteReadme(q) } });
  return plan;
}
