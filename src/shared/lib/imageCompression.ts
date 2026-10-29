// Pure helpers for shrinking uploaded images to a size budget (the canvas work lives in compressImage.ts).

export const GALLERY_IMAGE_MAX_BYTES = 500 * 1024;
export const GALLERY_IMAGE_MAX_EDGE = 1600;
export const DESIGN_IMAGE_MAX_BYTES = 1024 * 1024;
export const DESIGN_IMAGE_MAX_EDGE = 2000;

const QUALITIES = [0.9, 0.8, 0.7, 0.6, 0.5];
const MIN_EDGE = 640;

export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const ratio = Math.min(1, maxEdge / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

// Edge length and quality pairs to try in order: best quality at the full edge first, then lower quality,
// then a smaller edge (80% each step, never below MIN_EDGE) with the quality ladder again.
export function compressionAttempts(maxEdge: number): { edge: number; quality: number }[] {
  const edges: number[] = [];
  for (let e = maxEdge; e >= MIN_EDGE || edges.length === 0; e = Math.round(e * 0.8)) {
    edges.push(e);
    if (e <= MIN_EDGE) break;
  }
  return edges.flatMap((edge) => QUALITIES.map((quality) => ({ edge, quality })));
}

export function extForImageMime(mime: string): string {
  return mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
}

export function withExtension(fileName: string, mime: string): string {
  const base = fileName.replace(/\.[^.]*$/, '') || 'image';
  return `${base}.${extForImageMime(mime)}`;
}
