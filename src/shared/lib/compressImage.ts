import { compressionAttempts, fitWithin } from './imageCompression';

export type CompressedImage = { blob: Blob; width: number; height: number; mime: string };

const KEEP_AS_IS = ['image/png', 'image/jpeg', 'image/webp'];

function loadImage(file: File): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ img, revoke: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name || 'that image'}.`));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

// Shrinks an image to at most `maxBytes` and `maxEdge` pixels on the longest side. An image that already fits is
// returned untouched. Otherwise it is re-encoded as WebP (keeps transparency), lowering quality and then size
// until it fits; browsers without WebP encoding fall back to PNG (transparent) or JPEG (opaque).
export async function compressImage(file: File, opts: { maxBytes: number; maxEdge: number }): Promise<CompressedImage> {
  const { img, revoke } = await loadImage(file);
  try {
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    if (!natW || !natH) throw new Error(`Could not read ${file.name || 'that image'}.`);
    if (file.size <= opts.maxBytes && Math.max(natW, natH) <= opts.maxEdge && KEEP_AS_IS.includes(file.type)) {
      return { blob: file, width: natW, height: natH, mime: file.type };
    }

    let best: CompressedImage | null = null;
    let preferred = 'image/webp';
    let lastEdge = -1;
    let canvas: HTMLCanvasElement | null = null;
    let width = natW;
    let height = natH;
    for (const { edge, quality } of compressionAttempts(opts.maxEdge)) {
      if (edge !== lastEdge) {
        lastEdge = edge;
        ({ width, height } = fitWithin(natW, natH, edge));
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not process that image.');
        ctx.drawImage(img, 0, 0, width, height);
      }
      let blob = await toBlob(canvas!, preferred, quality);
      if (blob && blob.type !== preferred) {
        // The browser ignored the requested type (no WebP encoder): keep whatever it produced.
        preferred = blob.type;
      }
      if (!blob) blob = await toBlob(canvas!, 'image/png', 1);
      if (!blob) throw new Error('Could not process that image.');
      best = { blob, width, height, mime: blob.type || 'image/png' };
      if (blob.size <= opts.maxBytes) return best;
    }
    return best!;
  } finally {
    revoke();
  }
}
