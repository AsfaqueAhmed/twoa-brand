import type { StudioDesign } from './design';
import type { Layer } from './layers';

export const QUOTE_ID_PATTERN = /^CQ-[A-Z0-9]{8}$/;
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const cryptoRandom = (): number => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
};

export function generateQuoteId(rand: () => number = cryptoRandom): string {
  let id = 'CQ-';
  for (let i = 0; i < 8; i++) id += ID_ALPHABET[Math.floor(rand() * ID_ALPHABET.length)];
  return id;
}

export type QuoteContact = { name: string; phone: string; whatsapp: string };

// Keeps digits and one leading "+".
function normalizeNumber(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}
const digitCount = (n: string) => n.replace(/\D/g, '').length;

export function validateQuoteContact(
  c: QuoteContact,
): { ok: true; value: QuoteContact } | { ok: false; errors: Partial<Record<keyof QuoteContact, string>> } {
  const errors: Partial<Record<keyof QuoteContact, string>> = {};
  const name = c.name.trim();
  const phone = normalizeNumber(c.phone);
  const whatsapp = normalizeNumber(c.whatsapp);
  if (name.length < 2 || name.length > 100) errors.name = 'Please enter your name.';
  if (digitCount(phone) < 8 || digitCount(phone) > 15) errors.phone = 'Please enter a valid phone number.';
  if (digitCount(whatsapp) < 8 || digitCount(whatsapp) > 15) errors.whatsapp = 'Please enter a valid WhatsApp number.';
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: { name, phone, whatsapp } };
}

// Replaces each image layer's data URL with `artwork:<n>` (identical images share an index) so the design JSON stays small.
export function extractArtwork(design: StudioDesign): { design: StudioDesign; sources: string[] } {
  const sources: string[] = [];
  const indexOf = (src: string) => {
    const existing = sources.indexOf(src);
    if (existing >= 0) return existing;
    sources.push(src);
    return sources.length - 1;
  };
  const layersByView: Record<string, Layer[]> = {};
  for (const [viewId, layers] of Object.entries(design.layersByView)) {
    layersByView[viewId] = layers.map((l) => (l.type === 'image' ? { ...l, src: `artwork:${indexOf(l.src)}` } : l));
  }
  return { design: { ...design, layersByView }, sources };
}

export function dataUrlMime(dataUrl: string): string {
  return /^data:(image\/[a-z0-9.+-]+)[;,]/i.exec(dataUrl)?.[1]?.toLowerCase() ?? 'image/png';
}

export function extForMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

export function buildQuoteFiles(
  quoteId: string,
  views: { id: string; label: string }[],
  artworkMimes: string[],
): { previews: { viewId: string; label: string; path: string }[]; artwork: { name: string; path: string }[] } {
  return {
    previews: views.map((v) => ({ viewId: v.id, label: v.label, path: `quotes/${quoteId}/preview-${v.id}.png` })),
    artwork: artworkMimes.map((mime, i) => {
      const name = `artwork-${i + 1}.${extForMime(mime)}`;
      return { name, path: `quotes/${quoteId}/${name}` };
    }),
  };
}
