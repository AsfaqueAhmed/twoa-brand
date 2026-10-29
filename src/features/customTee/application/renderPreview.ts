import { ensureFontsLoaded } from './fontLoader';
import { type ImageLayer, type Layer, type TextLayer, TEXT_FONT_FRACTION } from '../domain/layers';

const DEFAULT_WIDTH = 1200;
const LINE_HEIGHT = 1.15;

function loadImage(src: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(crossOrigin ? 'Could not load the product image for the preview.' : 'Could not load an uploaded design image.'));
    img.src = src;
  });
}

const fontShorthand = (l: TextLayer, px: number) => `${l.italic ? 'italic ' : ''}${l.bold ? '700' : '400'} ${px}px ${l.fontFamily}`;

async function prepareFonts(layers: Layer[]): Promise<void> {
  ensureFontsLoaded();
  try {
    await document.fonts.ready;
  } catch {
    /* ignore */
  }
  const texts = layers.filter((l): l is TextLayer => l.type === 'text' && l.visible);
  await Promise.all(
    texts.map((l) => document.fonts.load(fontShorthand(l, 40), l.text).catch(() => undefined)),
  );
}

function drawImageLayer(ctx: CanvasRenderingContext2D, layer: ImageLayer, img: HTMLImageElement, W: number) {
  const w = layer.scale * W;
  const h = w / layer.aspect;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
}

function drawTextLayer(ctx: CanvasRenderingContext2D, layer: TextLayer, W: number) {
  const size = layer.scale * TEXT_FONT_FRACTION * W;
  ctx.font = fontShorthand(layer, size);
  ctx.fillStyle = layer.color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${layer.letterSpacing}em`;
  const lines = layer.text.split('\n');
  const lineH = size * LINE_HEIGHT;
  const widths = lines.map((line) => ctx.measureText(line).width);
  const blockW = Math.max(0, ...widths);
  const top = -(lines.length * lineH) / 2;
  lines.forEach((line, i) => {
    const x = layer.align === 'left' ? -blockW / 2 : layer.align === 'right' ? blockW / 2 - widths[i] : -widths[i] / 2;
    ctx.fillText(line, x, top + lineH * (i + 0.5));
  });
}

export async function renderViewPng(params: { baseImageUrl: string; layers: Layer[]; width?: number }): Promise<Blob> {
  const W = params.width ?? DEFAULT_WIDTH;
  const visible = params.layers.filter((l) => l.visible);
  await prepareFonts(visible);
  const base = await loadImage(params.baseImageUrl, true);
  const H = Math.round((W * base.naturalHeight) / base.naturalWidth);
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    visible.filter((l): l is ImageLayer => l.type === 'image').map(async (l) => images.set(l.id, await loadImage(l.src, false))),
  );

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create a canvas for the preview.');
  ctx.drawImage(base, 0, 0, W, H);

  for (const layer of visible) {
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    ctx.translate(layer.x * W, layer.y * H);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
    if (layer.type === 'image') drawImageLayer(ctx, layer, images.get(layer.id)!, W);
    else drawTextLayer(ctx, layer, W);
    ctx.restore();
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the preview image.'))), 'image/png');
  });
}
