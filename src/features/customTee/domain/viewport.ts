export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

// pan is the stage's top-left offset in container pixels; zoom scales the stage about its own top-left.
export type Viewport = { zoom: number; panX: number; panY: number };

export const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

// Zooms so the stage point under `cursor` (container pixels) stays under the cursor.
export function zoomAt(vp: Viewport, nextZoom: number, cursor: { x: number; y: number }): Viewport {
  const zoom = clampZoom(nextZoom);
  const ratio = zoom / vp.zoom;
  return { zoom, panX: cursor.x - (cursor.x - vp.panX) * ratio, panY: cursor.y - (cursor.y - vp.panY) * ratio };
}

export const panBy = (vp: Viewport, dx: number, dy: number): Viewport => ({ ...vp, panX: vp.panX + dx, panY: vp.panY + dy });

export function fitViewport(container: { w: number; h: number }, content: { w: number; h: number }, padding = 24): Viewport {
  const zoom = clampZoom(Math.min(1, (container.w - padding * 2) / content.w, (container.h - padding * 2) / content.h));
  return { zoom, panX: (container.w - content.w * zoom) / 2, panY: (container.h - content.h * zoom) / 2 };
}

export const MIN_VISIBLE_FRACTION = 0.25;

// Keeps at least `minVisible` of the stage (on each axis) inside the container, so the product can never be panned away.
// Returns the same viewport object when nothing needs clamping.
export function clampPan(
  vp: Viewport,
  container: { w: number; h: number },
  content: { w: number; h: number },
  minVisible = MIN_VISIBLE_FRACTION,
): Viewport {
  const stageW = content.w * vp.zoom;
  const stageH = content.h * vp.zoom;
  const panX = Math.min(container.w - minVisible * stageW, Math.max(-(1 - minVisible) * stageW, vp.panX));
  const panY = Math.min(container.h - minVisible * stageH, Math.max(-(1 - minVisible) * stageH, vp.panY));
  return panX === vp.panX && panY === vp.panY ? vp : { ...vp, panX, panY };
}
