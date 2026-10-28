export type LayerBase = {
  id: string;
  name: string;
  /** Center, as a fraction (0..1) of the canvas width. */
  x: number;
  /** Center, as a fraction (0..1) of the canvas height. */
  y: number;
  /** Image: layer width as a fraction of canvas width. Text: font size = scale * TEXT_FONT_FRACTION * canvas width. */
  scale: number;
  /** Degrees, normalized to (-180, 180]. */
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  visible: boolean;
};

export type ImageLayer = LayerBase & { type: 'image'; src: string; aspect: number };
export type TextLayer = LayerBase & { type: 'text'; text: string; fontFamily: string; color: string };
export type Layer = ImageLayer | TextLayer;

export type LayerPatch = Partial<Omit<LayerBase, 'id'>> & {
  src?: string;
  aspect?: number;
  text?: string;
  fontFamily?: string;
  color?: string;
};

export type AlignEdge = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 1.5;
export const DEFAULT_SCALE = 0.4;
export const TEXT_FONT_FRACTION = 0.2;
export const MAX_TEXT_LENGTH = 60;
export const DEFAULT_TEXT_COLOR = '#111111';

export const FONT_OPTIONS = [
  { label: 'Sans', family: 'Arial, Helvetica, sans-serif' },
  { label: 'Serif', family: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono', family: '"Courier New", Courier, monospace' },
  { label: 'Impact', family: 'Impact, "Arial Black", sans-serif' },
  { label: 'Script', family: '"Brush Script MT", "Segoe Script", cursive' },
] as const;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function normalizeRotation(deg: number): number {
  const r = ((((deg + 180) % 360) + 360) % 360) - 180;
  return r === -180 ? 180 : r;
}

export function clampLayer<T extends Layer>(layer: T): T {
  return {
    ...layer,
    x: clamp(layer.x, 0, 1),
    y: clamp(layer.y, 0, 1),
    scale: clamp(layer.scale, MIN_SCALE, MAX_SCALE),
    rotation: normalizeRotation(layer.rotation),
  };
}

const baseDefaults = { x: 0.5, y: 0.45, scale: DEFAULT_SCALE, rotation: 0, flipX: false, flipY: false, visible: true };

export function createImageLayer(init: { id: string; name: string; src: string; aspect: number }): ImageLayer {
  return { ...baseDefaults, type: 'image', ...init };
}

export function createTextLayer(init: { id: string; text: string; fontFamily?: string; color?: string }): TextLayer {
  return {
    ...baseDefaults,
    type: 'text',
    id: init.id,
    name: init.text.slice(0, 24) || 'Text',
    text: init.text,
    fontFamily: init.fontFamily ?? FONT_OPTIONS[0].family,
    color: init.color ?? DEFAULT_TEXT_COLOR,
  };
}

export const addLayer = (layers: Layer[], layer: Layer): Layer[] => [...layers, layer];
export const removeLayer = (layers: Layer[], id: string): Layer[] => layers.filter((l) => l.id !== id);

export function updateLayer(layers: Layer[], id: string, patch: LayerPatch): Layer[] {
  const { src, aspect, text, fontFamily, color, ...base } = patch;
  return layers.map((l) => {
    if (l.id !== id) return l;
    if (l.type === 'image') {
      return clampLayer({ ...l, ...base, ...(src !== undefined ? { src } : {}), ...(aspect !== undefined ? { aspect } : {}) });
    }
    return clampLayer({
      ...l,
      ...base,
      ...(text !== undefined ? { text } : {}),
      ...(fontFamily !== undefined ? { fontFamily } : {}),
      ...(color !== undefined ? { color } : {}),
    });
  });
}

export const toggleVisible = (layers: Layer[], id: string): Layer[] =>
  layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));

export const flipLayer = (layers: Layer[], id: string, axis: 'x' | 'y'): Layer[] =>
  layers.map((l) => (l.id === id ? (axis === 'x' ? { ...l, flipX: !l.flipX } : { ...l, flipY: !l.flipY }) : l));

// 'up' moves toward the top of the stack (later in the array).
export function moveLayer(layers: Layer[], id: string, direction: 'up' | 'down'): Layer[] {
  const i = layers.findIndex((l) => l.id === id);
  const j = direction === 'up' ? i + 1 : i - 1;
  if (i < 0 || j < 0 || j >= layers.length) return layers;
  const next = layers.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function reorderLayer(layers: Layer[], id: string, toIndex: number): Layer[] {
  const i = layers.findIndex((l) => l.id === id);
  if (i < 0) return layers;
  const next = layers.slice();
  const [moved] = next.splice(i, 1);
  next.splice(clamp(toIndex, 0, next.length), 0, moved);
  return next;
}

// `size` is the layer's unrotated box as fractions of the canvas width/height.
export function alignLayer(layer: Layer, size: { w: number; h: number }, edge: AlignEdge): LayerPatch {
  switch (edge) {
    case 'left':
      return { x: size.w / 2 };
    case 'center':
      return { x: 0.5 };
    case 'right':
      return { x: 1 - size.w / 2 };
    case 'top':
      return { y: size.h / 2 };
    case 'middle':
      return { y: 0.5 };
    case 'bottom':
      return { y: 1 - size.h / 2 };
  }
}

export const scaleToPercent = (scale: number): number => Math.round((scale / DEFAULT_SCALE) * 100);
export const percentToScale = (percent: number): number => (percent / 100) * DEFAULT_SCALE;
