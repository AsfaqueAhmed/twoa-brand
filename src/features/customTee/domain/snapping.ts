import type { Box } from './geometry';
import { normalizeRotation } from './layers';

export type Guide = { axis: 'x' | 'y'; position: number };
export type SnapResult = { dx: number; dy: number; guides: Guide[] };

const EPS = 1e-6;
const xLines = (b: Box) => [b.left, (b.left + b.right) / 2, b.right];
const yLines = (b: Box) => [b.top, (b.top + b.bottom) / 2, b.bottom];

// Finds the smallest shift (within `threshold`) that lines up one of `mine` with one of `candidates`.
function bestShift(mine: number[], candidates: number[], threshold: number): number | null {
  let best: number | null = null;
  for (const m of mine) {
    for (const c of candidates) {
      const d = c - m;
      if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    }
  }
  return best;
}

// Snaps a moving box to the canvas edges/center (0, 0.5, 1) and to the edges/centers of `targets`.
export function snapBox(box: Box, targets: Box[], threshold: { x: number; y: number }): SnapResult {
  const candX = [0, 0.5, 1, ...targets.flatMap(xLines)];
  const candY = [0, 0.5, 1, ...targets.flatMap(yLines)];
  const dx = bestShift(xLines(box), candX, threshold.x);
  const dy = bestShift(yLines(box), candY, threshold.y);
  const guides: Guide[] = [];
  const addGuides = (axis: 'x' | 'y', mine: number[], cands: number[], shift: number | null) => {
    if (shift === null) return;
    for (const m of mine) {
      for (const c of cands) {
        if (Math.abs(m + shift - c) < EPS && !guides.some((g) => g.axis === axis && Math.abs(g.position - c) < EPS)) {
          guides.push({ axis, position: c });
        }
      }
    }
  };
  addGuides('x', xLines(box), candX, dx);
  addGuides('y', yLines(box), candY, dy);
  return { dx: dx ?? 0, dy: dy ?? 0, guides };
}

// Snaps to the nearest multiple of `step` when within `tolerance` degrees (or always when `force`).
export function snapAngle(deg: number, step = 15, tolerance = 4, force = false): number {
  const nearest = Math.round(deg / step) * step;
  return force || Math.abs(deg - nearest) <= tolerance ? normalizeRotation(nearest) : deg;
}
