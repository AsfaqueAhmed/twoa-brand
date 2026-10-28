import type { ParentImage } from '@/shared/domain/types';

export const MAX_PARENT_IMAGES = 8;
export const MAX_IMAGE_TITLE_LENGTH = 40;
export const IMAGE_TITLE_SUGGESTIONS = ['Front', 'Back', 'Left', 'Right'] as const;

// Normalizes what the admin form submits: trims, drops blank/duplicate URLs, caps the count and title length,
// and gives untitled images a positional "Image N" title.
export function sanitizeParentImages(images: ParentImage[]): ParentImage[] {
  const seen = new Set<string>();
  const kept: ParentImage[] = [];
  for (const img of images) {
    const url = (img.url ?? '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    kept.push({ title: (img.title ?? '').trim().slice(0, MAX_IMAGE_TITLE_LENGTH), url });
    if (kept.length === MAX_PARENT_IMAGES) break;
  }
  return kept.map((img, i) => ({ ...img, title: img.title || `Image ${i + 1}` }));
}

// Tolerant reader for the jsonb column: skips malformed entries.
export function parseParentImages(raw: unknown): ParentImage[] {
  if (!Array.isArray(raw)) return [];
  const parsed: ParentImage[] = [];
  for (const v of raw) {
    if (!v || typeof v !== 'object') continue;
    const o = v as Record<string, unknown>;
    if (typeof o.url !== 'string' || !o.url.trim()) continue;
    parsed.push({ title: typeof o.title === 'string' ? o.title : '', url: o.url });
  }
  return sanitizeParentImages(parsed);
}

// The parent's images, falling back to its single legacy `image` as "Front".
export function getParentImages(parent: { image?: string; images?: ParentImage[] }): ParentImage[] {
  if (parent.images && parent.images.length > 0) return parent.images;
  const image = (parent.image ?? '').trim();
  return image ? [{ title: 'Front', url: image }] : [];
}

export const primaryImageUrl = (images: ParentImage[]): string => images[0]?.url ?? '';

// The first standard title (Front/Back/Left/Right) not used yet, else blank (sanitize numbers it).
export function nextImageTitle(images: ParentImage[]): string {
  const used = new Set(images.map((i) => i.title.trim().toLowerCase()));
  return IMAGE_TITLE_SUGGESTIONS.find((s) => !used.has(s.toLowerCase())) ?? '';
}
