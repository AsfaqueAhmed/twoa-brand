export type QuoteCheckout = {
  id: string;
  name: string;
  phone: string;
  parentProductId: string;
  parentName: string;
  teeSize: string;
  colorName?: string;
  lines: { size: string; qty: number }[];
  unitPrice: number;
  previews: { viewId: string; label: string; path: string }[];
  expiresAt: string;
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export function parseQuoteCheckout(raw: unknown): QuoteCheckout | null {
  if (!isObj(raw)) return null;
  const unitPrice = raw.unitPrice === null || raw.unitPrice === undefined ? NaN : Number(raw.unitPrice);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
  const id = str(raw.id);
  if (!id) return null;

  const lines: QuoteCheckout['lines'] = [];
  if (Array.isArray(raw.lines)) {
    for (const l of raw.lines) {
      if (!isObj(l) || typeof l.size !== 'string') continue;
      const qty = Number(l.qty);
      if (!Number.isInteger(qty) || qty < 1) continue;
      lines.push({ size: l.size, qty });
    }
  }
  if (lines.length === 0) return null;

  const previews: QuoteCheckout['previews'] = [];
  if (Array.isArray(raw.previews)) {
    for (const p of raw.previews) {
      if (!isObj(p) || typeof p.viewId !== 'string' || typeof p.label !== 'string' || typeof p.path !== 'string') continue;
      previews.push({ viewId: p.viewId, label: p.label, path: p.path });
    }
  }

  return {
    id,
    name: str(raw.name),
    phone: str(raw.phone),
    parentProductId: str(raw.parentProductId),
    parentName: str(raw.parentName),
    teeSize: str(raw.teeSize),
    colorName: typeof raw.colorName === 'string' && raw.colorName ? raw.colorName : undefined,
    lines,
    unitPrice,
    previews,
    expiresAt: str(raw.expiresAt),
  };
}

export function customOrderSubtotal(q: QuoteCheckout): number {
  return q.lines.reduce((sum, l) => sum + l.qty, 0) * q.unitPrice;
}

export function describeLines(lines: { size: string; qty: number }[]): string {
  return lines.map((l) => `${l.size} x ${l.qty}`).join(', ');
}
