import { describe, it, expect } from 'vitest';
import { createImageLayer, createTextLayer, FONT_OPTIONS, DEFAULT_TEXT_COLOR } from './layers';
import { validateArtworkFile, serializeDesign, parseDesign, MAX_ARTWORK_BYTES, type StudioDesign } from './design';

describe('validateArtworkFile', () => {
  it('accepts png/jpeg/webp up to 10 MB', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) expect(validateArtworkFile({ type, size: 1000 })).toBeNull();
    expect(validateArtworkFile({ type: 'image/png', size: MAX_ARTWORK_BYTES })).toBeNull();
  });
  it('rejects other types and oversized files', () => {
    expect(validateArtworkFile({ type: 'application/pdf', size: 10 })).toMatch(/PNG, JPG or WebP/);
    expect(validateArtworkFile({ type: 'image/svg+xml', size: 10 })).toMatch(/PNG, JPG or WebP/);
    expect(validateArtworkFile({ type: 'image/png', size: MAX_ARTWORK_BYTES + 1 })).toMatch(/10 MB/);
  });
});

describe('design serialization', () => {
  const design: StudioDesign = {
    parentProductId: 'p1',
    size: 'M',
    colorName: 'Black',
    layers: [
      createImageLayer({ id: 'i', name: 'a.png', src: 'data:image/png;base64,AAAA', aspect: 2 }),
      createTextLayer({ id: 't', text: 'Hi', fontFamily: FONT_OPTIONS[1].family, color: '#ff0000' }),
    ],
  };
  it('round-trips a design', () => {
    expect(parseDesign(serializeDesign(design))).toEqual(design);
  });
  it('returns null for null, junk or structurally invalid input', () => {
    expect(parseDesign(null)).toBeNull();
    expect(parseDesign('{nope')).toBeNull();
    expect(parseDesign(JSON.stringify({ size: 'M' }))).toBeNull();
  });
  it('drops invalid layers and sanitizes text layer fields', () => {
    const raw = JSON.stringify({
      parentProductId: 'p1',
      size: 'M',
      layers: [
        { ...design.layers[0], src: 'https://evil.example/x.png' }, // only data:image/ sources are allowed
        { ...design.layers[0], id: 'bad-aspect', aspect: 0 },
        { ...design.layers[1], color: 'url(javascript:alert(1))', fontFamily: 'Comic Sans' },
        { type: 'text', id: 'empty', name: 'x', text: '', x: 0.5, y: 0.5, scale: 0.4, rotation: 0 },
        'garbage',
      ],
    });
    const parsed = parseDesign(raw)!;
    expect(parsed.layers).toHaveLength(1);
    expect(parsed.layers[0]).toMatchObject({ type: 'text', color: DEFAULT_TEXT_COLOR, fontFamily: FONT_OPTIONS[0].family });
  });
  it('clamps out-of-range layer numbers', () => {
    const raw = JSON.stringify({ parentProductId: 'p', size: 'M', layers: [{ ...design.layers[0], x: 5, scale: 99 }] });
    expect(parseDesign(raw)!.layers[0]).toMatchObject({ x: 1, scale: 1.5 });
  });
});
