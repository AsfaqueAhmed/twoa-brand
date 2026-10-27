import type { HighlightIconKey, ProductHighlight } from '@/shared/domain/types';

export const HIGHLIGHT_ICON_KEYS: HighlightIconKey[] = [
  'leaf',
  'shirt',
  'truck',
  'shield',
  'package',
  'sparkles',
  'ruler',
  'droplets',
  'wind',
];

export const MAX_HIGHLIGHTS = 3;

const DEFAULT_ICON: HighlightIconKey = 'sparkles';

function isIconKey(value: unknown): value is HighlightIconKey {
  return typeof value === 'string' && (HIGHLIGHT_ICON_KEYS as string[]).includes(value);
}

// The feature row arrives as untyped JSON from the database / admin form, so
// everything is validated here: rows need a non-empty title, unknown icons fall
// back to a default, and the list is capped.
export function normalizeHighlights(raw: unknown): ProductHighlight[] {
  if (!Array.isArray(raw)) return [];
  const result: ProductHighlight[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { icon, title, subtitle } = item as Record<string, unknown>;
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    if (!cleanTitle) continue;
    result.push({
      icon: isIconKey(icon) ? icon : DEFAULT_ICON,
      title: cleanTitle,
      subtitle: typeof subtitle === 'string' ? subtitle.trim() : '',
    });
    if (result.length === MAX_HIGHLIGHTS) break;
  }
  return result;
}
