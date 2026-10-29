// Pure pixel code for the "Remove solid background" tool, .
// Everything here works on plain RGBA arrays so it runs (and is tested) without a DOM.

export const MIN_TOLERANCE = 5;
export const MAX_TOLERANCE = 80;
export const DEFAULT_TOLERANCE = 30;

/** Pixels at or below this alpha count as already transparent. */
const TRANSPARENT_ALPHA = 16;

export type Rgb = [number, number, number];

export function clampTolerance(t: number): number {
  if (!Number.isFinite(t)) return DEFAULT_TOLERANCE;
  return Math.min(MAX_TOLERANCE, Math.max(MIN_TOLERANCE, Math.round(t)));
}

/** Euclidean RGB distance scaled to 0..255 (black vs white = 255). */
export function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt((dr * dr + dg * dg + db * db) / 3);
}

function median(values: number[]): number {
  const s = values.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function borderIndices(width: number, height: number): number[] {
  const out: number[] = [];
  for (let x = 0; x < width; x++) {
    out.push(x);
    if (height > 1) out.push((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    out.push(y * width);
    if (width > 1) out.push(y * width + width - 1);
  }
  return out;
}

/**
 * The background colour: the per-channel median of the opaque border pixels.
 * Returns null when most of the border is already transparent (nothing to remove).
 */
export function estimateBackgroundColor(data: Uint8ClampedArray, width: number, height: number): Rgb | null {
  const border = borderIndices(width, height);
  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];
  for (const i of border) {
    const o = i * 4;
    if (data[o + 3] <= TRANSPARENT_ALPHA) continue;
    r.push(data[o]);
    g.push(data[o + 1]);
    b.push(data[o + 2]);
  }
  if (r.length === 0 || r.length < border.length / 2) return null;
  return [median(r), median(g), median(b)];
}

export type SolidRemovalResult = { data: Uint8ClampedArray; changed: boolean; background: Rgb | null };

/**
 * Removes a solid background: finds the background colour from the border, flood-fills from the edges through
 * pixels within `tolerance` (0..255 colour distance) and makes them transparent. Areas of the same colour that are
 * enclosed by the artwork are not reached, so they stay. Artwork pixels touching the removed area get an alpha ramp
 * (by colour distance) so anti-aliased edges do not leave a hard fringe. Returns a new array; the input is untouched.
 */
export function removeSolidBackground(
  input: Uint8ClampedArray,
  width: number,
  height: number,
  opts: { tolerance?: number } = {},
): SolidRemovalResult {
  const data = input.slice();
  const bg = estimateBackgroundColor(input, width, height);
  if (!bg) return { data, changed: false, background: null };

  const tolerance = opts.tolerance === undefined ? DEFAULT_TOLERANCE : Math.max(0, opts.tolerance);
  const feather = Math.max(12, tolerance * 0.6);
  const n = width * height;
  const isBg = new Uint8Array(n);
  const dist = (p: number) => colorDistance(input[p * 4], input[p * 4 + 1], input[p * 4 + 2], bg[0], bg[1], bg[2]);
  const passable = (p: number) => input[p * 4 + 3] <= TRANSPARENT_ALPHA || dist(p) <= tolerance;

  const stack: number[] = [];
  for (const p of borderIndices(width, height)) {
    if (!isBg[p] && passable(p)) {
      isBg[p] = 1;
      stack.push(p);
    }
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % width;
    const y = (p - x) / width;
    const visit = (q: number) => {
      if (!isBg[q] && passable(q)) {
        isBg[q] = 1;
        stack.push(q);
      }
    };
    if (x > 0) visit(p - 1);
    if (x < width - 1) visit(p + 1);
    if (y > 0) visit(p - width);
    if (y < height - 1) visit(p + width);
  }

  let changed = false;
  for (let p = 0; p < n; p++) {
    const a = p * 4 + 3;
    if (isBg[p]) {
      if (data[a] !== 0) changed = true;
      data[a] = 0;
      continue;
    }
    const x = p % width;
    const y = (p - x) / width;
    const touchesBg =
      (x > 0 && isBg[p - 1]) || (x < width - 1 && isBg[p + 1]) || (y > 0 && isBg[p - width]) || (y < height - 1 && isBg[p + width]);
    if (!touchesBg) continue;
    const ramp = (dist(p) - tolerance) / feather;
    if (ramp >= 1) continue;
    const next = Math.round(data[a] * Math.max(0, ramp));
    if (next !== data[a]) changed = true;
    data[a] = next;
  }
  return { data, changed, background: bg };
}
