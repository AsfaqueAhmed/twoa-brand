import { DEFAULT_FONT_FAMILY } from './fonts';
import { type Layer, FONT_OPTIONS, DEFAULT_TEXT_COLOR, MAX_TEXT_LENGTH, clampLayer } from './layers';
import { normalizeGroups } from './grouping';

export type StudioDesign = {
  parentProductId: string;
  size: string;
  colorName?: string;
  layersByView: Record<string, Layer[]>;
};

export const DESIGN_STORAGE_KEY = 'custom-tee-design';
export const MAX_ARTWORK_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const VIEW_KEY = /^view-\d{1,2}$/;
const LAYER_ID = /^[A-Za-z0-9_-]{1,64}$/;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function validateArtworkFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Please upload a PNG, JPG or WebP image.';
  if (file.size > MAX_ARTWORK_BYTES) return 'Artwork must be 10 MB or smaller.';
  return null;
}

export function pruneLayersByView(byView: Record<string, Layer[]>, viewIds: string[]): Record<string, Layer[]> {
  const out: Record<string, Layer[]> = {};
  for (const id of viewIds) {
    const ls = byView[id];
    if (Object.prototype.hasOwnProperty.call(byView, id) && ls.length > 0) out[id] = ls;
  }
  return out;
}

export const serializeDesign = (d: StudioDesign): string => JSON.stringify(d);

// Validates untrusted (sessionStorage) data: only data:image sources, known fonts, hex colors.
function parseLayer(v: unknown): Layer | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== 'string' || !LAYER_ID.test(o.id) || typeof o.name !== 'string') return null;
  if (!isNum(o.x) || !isNum(o.y) || !isNum(o.scale) || !isNum(o.rotation)) return null;
  const base = {
    id: o.id,
    name: o.name.slice(0, 80),
    x: o.x,
    y: o.y,
    scale: o.scale,
    rotation: o.rotation,
    flipX: o.flipX === true,
    flipY: o.flipY === true,
    visible: o.visible !== false,
    ...(typeof o.groupId === 'string' && LAYER_ID.test(o.groupId) ? { groupId: o.groupId } : {}),
  };
  if (o.type === 'image') {
    if (typeof o.src !== 'string' || !o.src.startsWith('data:image/') || !isNum(o.aspect) || o.aspect <= 0) return null;
    return clampLayer({ ...base, type: 'image' as const, src: o.src, aspect: o.aspect });
  }
  if (o.type === 'text') {
    if (typeof o.text !== 'string' || !o.text || o.text.length > MAX_TEXT_LENGTH) return null;
    const family = FONT_OPTIONS.find((f) => f.family === o.fontFamily)?.family ?? DEFAULT_FONT_FAMILY;
    const color = typeof o.color === 'string' && HEX_COLOR.test(o.color) ? o.color : DEFAULT_TEXT_COLOR;
    return clampLayer({
      ...base,
      type: 'text' as const,
      text: o.text,
      fontFamily: family,
      color,
      bold: o.bold === true,
      italic: o.italic === true,
      align: o.align === 'left' || o.align === 'right' ? o.align : ('center' as const),
      letterSpacing: isNum(o.letterSpacing) ? o.letterSpacing : 0,
    });
  }
  return null;
}

function parseLayerList(list: unknown): Layer[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: Layer[] = [];
  for (const raw of list) {
    const l = parseLayer(raw);
    if (!l || seen.has(l.id)) continue;
    seen.add(l.id);
    out.push(l);
  }
  return normalizeGroups(out);
}

export function parseDesign(raw: string | null): StudioDesign | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v.parentProductId !== 'string' || typeof v.size !== 'string') return null;
    const layersByView: Record<string, Layer[]> = {};
    if (v.layersByView && typeof v.layersByView === 'object' && !Array.isArray(v.layersByView)) {
      for (const [key, list] of Object.entries(v.layersByView)) {
        if (!VIEW_KEY.test(key)) continue;
        const layers = parseLayerList(list);
        if (layers.length > 0) layersByView[key] = layers;
      }
    } else {
      const legacy = parseLayerList(v.layers); // older designs stored a single `layers` array
      if (legacy.length > 0) layersByView['view-0'] = legacy;
    }
    return { parentProductId: v.parentProductId, size: v.size, colorName: typeof v.colorName === 'string' ? v.colorName : undefined, layersByView };
  } catch {
    return null;
  }
}
