// Browser glue for background removal, shared by the studios and the admin gallery upload.
// removeSolidBackgroundFromBlob: instant colour-key remover (pure pixel code in ./backgroundRemoval).
// Returns a transparent PNG at the image's original resolution and never touches the input.

import { clampTolerance, removeSolidBackground } from './backgroundRemoval';

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    img.src = url;
  });
}

function drawToCanvas(img: HTMLImageElement): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || !canvas.width || !canvas.height) throw new Error('Could not process that image.');
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx };
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process that image.'))), 'image/png'),
  );
}

/** Fetches any image src (data URL, blob URL, CORS-enabled http URL) as a Blob. */
export async function srcToBlob(src: string): Promise<Blob> {
  const res = await fetch(src);
  if (!res.ok) throw new Error('Could not load that image.');
  return res.blob();
}

export async function removeSolidBackgroundFromBlob(blob: Blob, tolerance: number, includeEnclosed = false): Promise<{ blob: Blob; changed: boolean }> {
  const img = await loadImage(blob);
  const { canvas, ctx } = drawToCanvas(img);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, changed } = removeSolidBackground(imageData.data, canvas.width, canvas.height, { tolerance: clampTolerance(tolerance), includeEnclosed });
  if (!changed) return { blob, changed: false };
  imageData.data.set(data);
  ctx.putImageData(imageData, 0, 0);
  return { blob: await toPng(canvas), changed: true };
}
