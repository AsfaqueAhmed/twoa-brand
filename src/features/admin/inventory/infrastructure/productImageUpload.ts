import { supabase } from '@/shared/infrastructure/supabase/client';
import { FULL_SUFFIX, THUMB_SUFFIX } from '@/shared/lib/imageUrls';
import { fitWithin } from './imageResize';

const BUCKET = 'images';
// Object paths always contain a timestamp, so an uploaded object never changes:
// safe to cache for a year.
const CACHE_CONTROL = '31536000';
const FULL_MAX_EDGE = 1600;
const FULL_QUALITY = 0.82;
const THUMB_MAX_EDGE = 640;
const THUMB_QUALITY = 0.8;

function extensionForDataUrl(dataUrl: string): string {
  const match = /^data:image\/(\w+);base64,/.exec(dataUrl);
  const type = match?.[1] ?? 'jpeg';
  return type === 'jpeg' ? 'jpg' : type;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = dataUrl;
  });
}

// Thin canvas wrapper: resizes (never upscaling) and encodes to WebP. The
// returned blob's type tells the caller whether the browser really produced WebP.
async function encodeWebp(img: HTMLImageElement, maxEdge: number, quality: number): Promise<Blob | null> {
  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
}

async function uploadObject(path: string, body: Blob | Uint8Array, contentType: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType, cacheControl: CACHE_CONTROL, upsert: false });
  if (error) throw error;
}

function publicUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Legacy single-file path, used when the browser cannot encode WebP.
async function uploadOriginal(storagePath: string, dataUrl: string): Promise<string> {
  const base64 = dataUrl.split(',')[1] ?? '';
  const ext = extensionForDataUrl(dataUrl);
  const path = `${storagePath}.${ext}`;
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  await uploadObject(path, bytes, `image/${ext === 'jpg' ? 'jpeg' : ext}`);
  return publicUrl(path);
}

// Uploads a cropped data URL as `<storagePath>.full.webp` (max `options.maxEdge`, default 1600px) plus a
// `<storagePath>.thumb.webp` (max 640px) and returns the FULL public URL.
// storagePath must be unique per upload (include a timestamp): objects are
// cached for a year and never overwritten.
export async function uploadProductImage(
  storagePath: string,
  dataUrl: string,
  options: { thumbnail?: boolean; maxEdge?: number } = {},
): Promise<string> {
  const { thumbnail = true, maxEdge = FULL_MAX_EDGE } = options;

  let img: HTMLImageElement;
  let full: Blob | null;
  try {
    img = await loadImage(dataUrl);
    full = await encodeWebp(img, maxEdge, FULL_QUALITY);
  } catch {
    return uploadOriginal(storagePath, dataUrl);
  }
  if (!full || full.type !== 'image/webp') return uploadOriginal(storagePath, dataUrl);

  const fullPath = `${storagePath}${FULL_SUFFIX}`;
  await uploadObject(fullPath, full, 'image/webp');

  if (thumbnail) {
    try {
      const thumb = await encodeWebp(img, THUMB_MAX_EDGE, THUMB_QUALITY);
      if (thumb && thumb.type === 'image/webp') {
        await uploadObject(`${storagePath}${THUMB_SUFFIX}`, thumb, 'image/webp');
      }
    } catch (err) {
      console.error('Thumbnail upload failed; continuing with full image only', err);
    }
  }

  return publicUrl(fullPath);
}
