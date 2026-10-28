import { type AlignEdge, type Layer, updateLayer } from './layers';
import { selectionUnits } from './grouping';

export type Size = { w: number; h: number };
export type CanvasPx = { w: number; h: number };
export type Box = { left: number; top: number; right: number; bottom: number };

const FULL: Box = { left: 0, top: 0, right: 1, bottom: 1 };

// Bounding box of the (rotated) layer, in canvas fractions.
export function layerBox(layer: Layer, size: Size, canvas: CanvasPx): Box {
  const rad = (layer.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const wPx = size.w * canvas.w;
  const hPx = size.h * canvas.h;
  const bw = (wPx * cos + hPx * sin) / canvas.w;
  const bh = (wPx * sin + hPx * cos) / canvas.h;
  return { left: layer.x - bw / 2, right: layer.x + bw / 2, top: layer.y - bh / 2, bottom: layer.y + bh / 2 };
}

export function unionBox(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  return boxes.reduce((u, b) => ({
    left: Math.min(u.left, b.left),
    top: Math.min(u.top, b.top),
    right: Math.max(u.right, b.right),
    bottom: Math.max(u.bottom, b.bottom),
  }));
}

export const boxCenter = (b: Box) => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 });

export const boxesIntersect = (a: Box, b: Box): boolean =>
  a.left <= b.right && b.left <= a.right && a.top <= b.bottom && b.top <= a.bottom;

export function moveLayersBy(layers: Layer[], ids: string[], dx: number, dy: number): Layer[] {
  const selected = new Set(ids);
  let out = layers;
  for (const l of layers) {
    if (selected.has(l.id)) out = updateLayer(out, l.id, { x: l.x + dx, y: l.y + dy });
  }
  return out;
}

// Scales positions (in pixel space, so the aspect ratio is respected) and sizes about `anchor`.
export function scaleLayersAround(layers: Layer[], ids: string[], factor: number, anchor: { x: number; y: number }, canvas: CanvasPx): Layer[] {
  const selected = new Set(ids);
  let out = layers;
  for (const l of layers) {
    if (!selected.has(l.id)) continue;
    out = updateLayer(out, l.id, {
      x: anchor.x + ((l.x - anchor.x) * factor),
      y: anchor.y + ((l.y - anchor.y) * factor),
      scale: l.scale * factor,
    });
  }
  void canvas; // normalized offsets scale uniformly, so the canvas size isn't needed for scaling
  return out;
}

// Rotates positions (in pixel space) and orientations about `anchor`.
export function rotateLayersAround(layers: Layer[], ids: string[], deg: number, anchor: { x: number; y: number }, canvas: CanvasPx): Layer[] {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const selected = new Set(ids);
  let out = layers;
  for (const l of layers) {
    if (!selected.has(l.id)) continue;
    const vx = (l.x - anchor.x) * canvas.w;
    const vy = (l.y - anchor.y) * canvas.h;
    out = updateLayer(out, l.id, {
      x: anchor.x + (vx * cos - vy * sin) / canvas.w,
      y: anchor.y + (vx * sin + vy * cos) / canvas.h,
      rotation: l.rotation + deg,
    });
  }
  return out;
}

type UnitBoxes = { units: string[][]; boxes: Box[] } | null;

function unitBoxes(layers: Layer[], ids: string[], sizes: Record<string, Size>, canvas: CanvasPx): UnitBoxes {
  const units = selectionUnits(layers, ids);
  const boxes: Box[] = [];
  for (const unit of units) {
    const members: Box[] = [];
    for (const id of unit) {
      const layer = layers.find((l) => l.id === id);
      const size = sizes[id];
      if (!layer || !size) return null;
      members.push(layerBox(layer, size, canvas));
    }
    boxes.push(unionBox(members)!);
  }
  return { units, boxes };
}

// One unit (a layer or a whole group) aligns to the canvas; two or more units align to the selection's bounds.
export function alignLayers(layers: Layer[], ids: string[], sizes: Record<string, Size>, edge: AlignEdge, canvas: CanvasPx): Layer[] {
  const ub = unitBoxes(layers, ids, sizes, canvas);
  if (!ub || ub.units.length === 0) return layers;
  const target = ub.units.length === 1 ? FULL : unionBox(ub.boxes)!;
  let out = layers;
  ub.units.forEach((unit, i) => {
    const b = ub.boxes[i];
    let dx = 0;
    let dy = 0;
    if (edge === 'left') dx = target.left - b.left;
    else if (edge === 'center') dx = (target.left + target.right) / 2 - (b.left + b.right) / 2;
    else if (edge === 'right') dx = target.right - b.right;
    else if (edge === 'top') dy = target.top - b.top;
    else if (edge === 'middle') dy = (target.top + target.bottom) / 2 - (b.top + b.bottom) / 2;
    else dy = target.bottom - b.bottom;
    if (dx !== 0 || dy !== 0) out = moveLayersBy(out, unit, dx, dy);
  });
  return out;
}

// Equal gaps between three or more units; the outermost two stay where they are.
export function distributeLayers(layers: Layer[], ids: string[], sizes: Record<string, Size>, axis: 'horizontal' | 'vertical', canvas: CanvasPx): Layer[] {
  const ub = unitBoxes(layers, ids, sizes, canvas);
  if (!ub || ub.units.length < 3) return layers;
  const start = (b: Box) => (axis === 'horizontal' ? b.left : b.top);
  const end = (b: Box) => (axis === 'horizontal' ? b.right : b.bottom);
  const order = ub.units.map((_, i) => i).sort((a, b) => start(ub.boxes[a]) + end(ub.boxes[a]) - (start(ub.boxes[b]) + end(ub.boxes[b])));
  const first = ub.boxes[order[0]];
  const last = ub.boxes[order[order.length - 1]];
  const total = end(last) - start(first);
  const used = order.reduce((sum, i) => sum + (end(ub.boxes[i]) - start(ub.boxes[i])), 0);
  const gap = (total - used) / (order.length - 1);
  let cursor = start(first);
  let out = layers;
  for (const i of order) {
    const b = ub.boxes[i];
    const delta = cursor - start(b);
    if (delta !== 0) out = axis === 'horizontal' ? moveLayersBy(out, ub.units[i], delta, 0) : moveLayersBy(out, ub.units[i], 0, delta);
    cursor += end(b) - start(b) + gap;
  }
  return out;
}
