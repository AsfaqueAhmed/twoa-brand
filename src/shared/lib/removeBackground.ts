// Browser glue for background removal, shared by the studios and the admin gallery upload.
//  - removeSolidBackgroundFromBlob: instant colour-key remover (pure pixel code in ./backgroundRemoval).
//  - removeBackgroundAi: BiRefNet-lite (MIT) through @huggingface/transformers (Apache-2.0), loaded on demand.
// Both return a transparent PNG at the image's original resolution and never touch the input.

import { aiBackgroundRemovalSupported, clampTolerance, isLikelyMobile, removeSolidBackground } from './backgroundRemoval';

export const AI_MODEL_ID = 'onnx-community/BiRefNet_lite-ONNX';
export const AI_MODEL_NOTE = 'Downloads a ~115 MB model once (cached afterwards).';

export type BgRemovalProgress = { stage: 'download'; percent: number } | { stage: 'processing' };

export function progressLabel(p: BgRemovalProgress): string {
  return p.stage === 'download' ? `Downloading model… ${Math.round(p.percent)}%` : 'Removing background…';
}

/** Whether to offer the AI remover on this device (see aiBackgroundRemovalSupported). */
export function detectAiBackgroundRemoval(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { gpu?: unknown; deviceMemory?: number };
  return aiBackgroundRemovalSupported({
    hasWebGpu: !!nav.gpu,
    isMobile: isLikelyMobile({
      userAgent: nav.userAgent,
      maxTouchPoints: nav.maxTouchPoints ?? 0,
      screenWidth: Math.min(window.screen?.width ?? window.innerWidth, window.screen?.height ?? window.innerHeight) || window.innerWidth,
    }),
    deviceMemoryGb: nav.deviceMemory,
  });
}

const NOTE_KEY = 'bg-remove-ai-model-note-seen';
export function aiModelNoteSeen(): boolean {
  try {
    return localStorage.getItem(NOTE_KEY) === '1';
  } catch {
    return false;
  }
}
export function markAiModelNoteSeen(): void {
  try {
    localStorage.setItem(NOTE_KEY, '1');
  } catch {
    // private mode: the note simply shows again next time
  }
}

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

export async function removeSolidBackgroundFromBlob(blob: Blob, tolerance: number): Promise<{ blob: Blob; changed: boolean }> {
  const img = await loadImage(blob);
  const { canvas, ctx } = drawToCanvas(img);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, changed } = removeSolidBackground(imageData.data, canvas.width, canvas.height, { tolerance: clampTolerance(tolerance) });
  if (!changed) return { blob, changed: false };
  imageData.data.set(data);
  ctx.putImageData(imageData, 0, 0);
  return { blob: await toPng(canvas), changed: true };
}

type Mask = { data: Uint8Array | Uint8ClampedArray; width: number; height: number; channels: number };
type Device = 'webgpu' | 'wasm';
type Loaded = {
  run: (input: unknown) => Promise<{ mask: Mask }[]>;
  dispose: () => Promise<void>;
  RawImage: typeof import('@huggingface/transformers').RawImage;
};

const loaded: Partial<Record<Device, Promise<Loaded>>> = {};
// Set once WebGPU failed on this device (some GPUs load the model but cannot run it): use WASM from then on.
let webGpuFailed = false;

function loadSegmenter(device: Device, onProgress?: (p: BgRemovalProgress) => void): Promise<Loaded> {
  const existing = loaded[device];
  if (existing) return existing;
  const promise = (async (): Promise<Loaded> => {
    // Dynamic import: the library (and onnxruntime-web) is only fetched when someone actually asks for AI removal.
    const { pipeline, env, RawImage } = await import('@huggingface/transformers');
    env.allowLocalModels = false; // always the Hugging Face CDN (no /models/ lookups on our host)
    env.allowRemoteModels = true;
    env.useBrowserCache = true; // the ~115 MB weights are kept in the Cache API after the first download

    const progress_callback = (info: { status: string; progress?: number; file?: string }) => {
      if (!onProgress) return;
      if (info.status === 'progress_total' && typeof info.progress === 'number') onProgress({ stage: 'download', percent: info.progress });
      else if (info.status === 'progress' && typeof info.progress === 'number' && info.file?.endsWith('.onnx')) {
        onProgress({ stage: 'download', percent: info.progress });
      }
    };
    // fp16 weights (~115 MB) on both backends, so a WebGPU -> WASM fallback reuses the cached download.
    const pipe = await pipeline('image-segmentation', AI_MODEL_ID, { device, dtype: 'fp16', progress_callback } as Parameters<typeof pipeline>[2]);
    const p = pipe as unknown as Loaded['run'] & { dispose?: () => Promise<void> };
    return { run: (input) => p(input), dispose: async () => p.dispose?.(), RawImage };
  })();
  loaded[device] = promise;
  promise.catch(() => {
    if (loaded[device] === promise) delete loaded[device]; // allow a retry after a failed download
  });
  return promise;
}

async function segment(blob: Blob, onProgress?: (p: BgRemovalProgress) => void): Promise<Mask> {
  const hasWebGpu = typeof navigator !== 'undefined' && !!(navigator as Navigator & { gpu?: unknown }).gpu;
  const devices: Device[] = hasWebGpu && !webGpuFailed ? ['webgpu', 'wasm'] : ['wasm'];
  let lastError: unknown = null;
  for (const device of devices) {
    try {
      const seg = await loadSegmenter(device, onProgress);
      onProgress?.({ stage: 'processing' });
      const [{ mask }] = await seg.run(await seg.RawImage.fromBlob(blob));
      return mask;
    } catch (err) {
      lastError = err;
      if (device === 'webgpu') {
        webGpuFailed = true;
        console.warn('[bg-remove] WebGPU failed, falling back to WASM:', err);
        const gpu = loaded.webgpu;
        delete loaded.webgpu;
        gpu?.then((g) => g.dispose()).catch(() => {});
      }
    }
  }
  throw lastError ?? new Error('Could not load the background removal model.');
}

function friendlyAiError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn('[bg-remove] AI background removal failed:', err);
  if (/memory|alloc|OOM|RangeError/i.test(msg)) return new Error('Not enough memory on this device for AI background removal. Try the solid background remover instead.');
  if (/fetch|network|Failed to load|404|download/i.test(msg)) return new Error('Could not download the background removal model. Check your connection and try again.');
  return new Error('AI background removal failed. Your image was not changed.');
}

/** AI background removal. Returns a transparent PNG at the original resolution. */
export async function removeBackgroundAi(blob: Blob, onProgress?: (p: BgRemovalProgress) => void): Promise<Blob> {
  try {
    const mask = await segment(blob, onProgress);
    const img = await loadImage(blob);
    const { canvas, ctx } = drawToCanvas(img);

    // Mask -> alpha-only canvas, scaled to the original image, then keep the image only where the mask is.
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = mask.width;
    maskCanvas.height = mask.height;
    const mctx = maskCanvas.getContext('2d');
    if (!mctx) throw new Error('Could not process that image.');
    const rgba = new ImageData(mask.width, mask.height);
    const step = mask.channels;
    for (let i = 0, j = 0; i < rgba.data.length; i += 4, j += step) rgba.data[i + 3] = mask.data[j];
    mctx.putImageData(rgba, 0, 0);

    ctx.globalCompositeOperation = 'destination-in';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    return await toPng(canvas);
  } catch (err) {
    throw friendlyAiError(err);
  }
}
