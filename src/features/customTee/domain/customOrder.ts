export type CheckoutDesign = {
  id: string;
  parentProductId: string;
  parentName: string;
  teeSize: string;
  colorName?: string;
  lines: { size: string; qty: number }[];
  unitPrice: number;
  previews: { viewId: string; label: string; path: string }[];
};

// Another design an admin combined into this checkout (same customer, one order).
export type QuoteCheckoutExtra = CheckoutDesign;

export type QuoteCheckout = CheckoutDesign & {
  name: string;
  phone: string;
  expiresAt: string;
  extras: QuoteCheckoutExtra[];
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function parseDesign(raw: unknown): CheckoutDesign | null {
  if (!isObj(raw)) return null;
  const unitPrice = raw.unitPrice === null || raw.unitPrice === undefined ? NaN : Number(raw.unitPrice);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
  const id = str(raw.id);
  if (!id) return null;

  const lines: CheckoutDesign['lines'] = [];
  if (Array.isArray(raw.lines)) {
    for (const l of raw.lines) {
      if (!isObj(l) || typeof l.size !== 'string') continue;
      const qty = Number(l.qty);
      if (!Number.isInteger(qty) || qty < 1) continue;
      lines.push({ size: l.size, qty });
    }
  }
  if (lines.length === 0) return null;

  const previews: CheckoutDesign['previews'] = [];
  if (Array.isArray(raw.previews)) {
    for (const p of raw.previews) {
      if (!isObj(p) || typeof p.viewId !== 'string' || typeof p.label !== 'string' || typeof p.path !== 'string') continue;
      previews.push({ viewId: p.viewId, label: p.label, path: p.path });
    }
  }

  return {
    id,
    parentProductId: str(raw.parentProductId),
    parentName: str(raw.parentName),
    teeSize: str(raw.teeSize),
    colorName: typeof raw.colorName === 'string' && raw.colorName ? raw.colorName : undefined,
    lines,
    unitPrice,
    previews,
  };
}

export function parseQuoteCheckout(raw: unknown): QuoteCheckout | null {
  const lead = parseDesign(raw);
  if (!lead || !isObj(raw)) return null;

  // A malformed extra means the summary could not match what the order will charge, so reject the whole checkout.
  const extras: QuoteCheckoutExtra[] = [];
  if (Array.isArray(raw.extras)) {
    for (const e of raw.extras) {
      const d = parseDesign(e);
      if (!d) return null;
      extras.push(d);
    }
  }

  return { ...lead, name: str(raw.name), phone: str(raw.phone), expiresAt: str(raw.expiresAt), extras };
}

export function checkoutDesigns(q: QuoteCheckout): CheckoutDesign[] {
  return [q, ...q.extras];
}

const pieces = (d: CheckoutDesign) => d.lines.reduce((sum, l) => sum + l.qty, 0);

export function customOrderPieces(q: QuoteCheckout): number {
  return checkoutDesigns(q).reduce((sum, d) => sum + pieces(d), 0);
}

export function customOrderSubtotal(q: QuoteCheckout): number {
  return checkoutDesigns(q).reduce((sum, d) => sum + pieces(d) * d.unitPrice, 0);
}

export function checkoutHeading(q: QuoteCheckout): string {
  const n = q.extras.length;
  return n === 0 ? `Quote ${q.id}` : `Quote ${q.id} and ${n} more ${n === 1 ? 'design' : 'designs'}`;
}

export function checkoutContentIds(q: QuoteCheckout): string[] {
  return [...new Set(checkoutDesigns(q).map((d) => d.parentProductId || d.id))];
}

export function describeLines(lines: { size: string; qty: number }[]): string {
  return lines.map((l) => `${l.size} x ${l.qty}`).join(', ');
}
