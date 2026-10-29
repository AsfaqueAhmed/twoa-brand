import { describe, it, expect } from 'vitest';
import { createImageLayer, createTextLayer } from './layers';
import type { StudioDesign } from './design';
import {
  QUOTE_ID_PATTERN,
  buildQuoteFiles,
  dataUrlMime,
  extForMime,
  extractArtwork,
  generateQuoteId,
  validateQuoteContact,
} from './quote';

describe('generateQuoteId', () => {
  it('produces CQ- plus 8 characters from the allowed alphabet', () => {
    let i = 0;
    const id = generateQuoteId(() => (i++ % 10) / 10);
    expect(id).toMatch(QUOTE_ID_PATTERN);
  });
  it('is not constant with real randomness', () => {
    expect(generateQuoteId()).not.toBe(generateQuoteId());
  });
});

describe('validateQuoteContact', () => {
  it('accepts and normalizes valid contacts', () => {
    const r = validateQuoteContact({ name: '  Rahim Uddin ', phone: '01711-223344', whatsapp: '+880 1711 223344' });
    expect(r).toEqual({ ok: true, value: { name: 'Rahim Uddin', phone: '01711223344', whatsapp: '+8801711223344' } });
  });
  it('reports each invalid field', () => {
    const r = validateQuoteContact({ name: 'A', phone: '123', whatsapp: 'abc' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['name', 'phone', 'whatsapp']);
  });
  it('rejects overlong names and numbers', () => {
    expect(validateQuoteContact({ name: 'x'.repeat(101), phone: '01711223344', whatsapp: '01711223344' }).ok).toBe(false);
    expect(validateQuoteContact({ name: 'Ok Name', phone: '1'.repeat(16), whatsapp: '01711223344' }).ok).toBe(false);
  });
});

describe('extractArtwork', () => {
  const A = 'data:image/png;base64,AAAA';
  const B = 'data:image/jpeg;base64,BBBB';
  const design: StudioDesign = {
    parentProductId: 'p',
    size: 'M',
    layersByView: {
      'view-0': [createImageLayer({ id: 'a', name: 'a', src: A, aspect: 1 }), createTextLayer({ id: 't', text: 'Hi' })],
      'view-1': [createImageLayer({ id: 'b', name: 'b', src: B, aspect: 1 }), createImageLayer({ id: 'c', name: 'c', src: A, aspect: 1 })],
    },
  };
  it('replaces image sources with artwork references and de-duplicates', () => {
    const { design: out, sources } = extractArtwork(design);
    expect(sources).toEqual([A, B]);
    const l0 = out.layersByView['view-0'];
    const l1 = out.layersByView['view-1'];
    expect(l0[0]).toMatchObject({ type: 'image', src: 'artwork:0' });
    expect(l1[0]).toMatchObject({ src: 'artwork:1' });
    expect(l1[1]).toMatchObject({ src: 'artwork:0' });
    expect(l0[1]).toMatchObject({ type: 'text', text: 'Hi' });
  });
  it('does not mutate the input', () => {
    extractArtwork(design);
    expect(design.layersByView['view-0'][0]).toMatchObject({ src: A });
  });
  it('handles designs with no artwork', () => {
    const r = extractArtwork({ parentProductId: 'p', size: 'M', layersByView: {} });
    expect(r.sources).toEqual([]);
  });
});

describe('mime helpers and file paths', () => {
  it('reads mime types and picks extensions', () => {
    expect(dataUrlMime('data:image/png;base64,AA')).toBe('image/png');
    expect(dataUrlMime('nonsense')).toBe('image/png');
    expect(extForMime('image/jpeg')).toBe('jpg');
    expect(extForMime('image/webp')).toBe('webp');
    expect(extForMime('image/png')).toBe('png');
  });
  it('builds storage paths under the quote folder', () => {
    const files = buildQuoteFiles('CQ-ABCD2345', [{ id: 'view-0', label: 'Front' }, { id: 'view-1', label: 'Back' }], ['image/png', 'image/jpeg']);
    expect(files.previews).toEqual([
      { viewId: 'view-0', label: 'Front', path: 'quotes/CQ-ABCD2345/preview-view-0.png' },
      { viewId: 'view-1', label: 'Back', path: 'quotes/CQ-ABCD2345/preview-view-1.png' },
    ]);
    expect(files.artwork).toEqual([
      { name: 'artwork-1.png', path: 'quotes/CQ-ABCD2345/artwork-1.png' },
      { name: 'artwork-2.jpg', path: 'quotes/CQ-ABCD2345/artwork-2.jpg' },
    ]);
  });
});
