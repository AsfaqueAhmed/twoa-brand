import { describe, it, expect } from 'vitest';
import { createImageLayer, createTextLayer, FONT_OPTIONS, DEFAULT_TEXT_COLOR } from './layers';
import { validateArtworkFile, serializeDesign, parseDesign, pruneLayersByView, MAX_ARTWORK_BYTES, type StudioDesign } from './design';

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
  const layers = [
    createImageLayer({ id: 'i', name: 'a.png', src: 'data:image/png;base64,AAAA', aspect: 2 }),
    createTextLayer({ id: 't', text: 'Hi', fontFamily: FONT_OPTIONS[1].family, color: '#ff0000' }),
  ];
  const design: StudioDesign = {
    parentProductId: 'p1',
    size: 'M',
    colorName: 'Black',
    layersByView: { 'view-0': layers },
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
        { ...layers[0], src: 'https://evil.example/x.png' }, // only data:image/ sources are allowed
        { ...layers[0], id: 'bad-aspect', aspect: 0 },
        { ...layers[1], color: 'url(javascript:alert(1))', fontFamily: 'Comic Sans' },
        { type: 'text', id: 'empty', name: 'x', text: '', x: 0.5, y: 0.5, scale: 0.4, rotation: 0 },
        'garbage',
      ],
    });
    const parsed = parseDesign(raw)!;
    expect(parsed.layersByView['view-0']).toHaveLength(1);
    expect(parsed.layersByView['view-0'][0]).toMatchObject({ type: 'text', color: DEFAULT_TEXT_COLOR, fontFamily: FONT_OPTIONS[0].family });
  });
  it('drops layers with unsafe or duplicate ids and non-6-digit colors', () => {
    const raw = JSON.stringify({
      parentProductId: 'p1',
      size: 'M',
      layers: [
        { ...layers[0], id: 'a"b]' },
        { ...layers[0], id: 'ok-1' },
        { ...layers[0], id: 'ok-1', name: 'dup' },
        { ...layers[1], id: 'short', color: '#abc' },
      ],
    });
    const parsed = parseDesign(raw)!;
    expect(parsed.layersByView['view-0'].map((l) => l.id)).toEqual(['ok-1', 'short']);
    expect(parsed.layersByView['view-0'][0].name).toBe('a.png');
    expect(parsed.layersByView['view-0'][1]).toMatchObject({ color: DEFAULT_TEXT_COLOR });
  });
  it('clamps out-of-range layer numbers', () => {
    const raw = JSON.stringify({ parentProductId: 'p', size: 'M', layers: [{ ...layers[0], x: 5, scale: 99 }] });
    expect(parseDesign(raw)!.layersByView['view-0'][0]).toMatchObject({ x: 1, scale: 1.5 });
  });
});

describe('per-view layers', () => {
  const img = (id: string) => createImageLayer({ id, name: `${id}.png`, src: 'data:image/png;base64,AAAA', aspect: 1 });
  it('round-trips layers for several views and drops empty views', () => {
    const design = { parentProductId: 'p', size: 'M', layersByView: { 'view-0': [img('a')], 'view-1': [img('b'), createTextLayer({ id: 't', text: 'Hi' })] } };
    expect(parseDesign(serializeDesign(design))).toEqual(design);
    const withEmpty = { ...design, layersByView: { ...design.layersByView, 'view-2': [] } };
    expect(Object.keys(parseDesign(serializeDesign(withEmpty))!.layersByView)).toEqual(['view-0', 'view-1']);
  });
  it('loads the legacy layers array into view-0', () => {
    const raw = JSON.stringify({ parentProductId: 'p', size: 'M', layers: [img('a')] });
    expect(Object.keys(parseDesign(raw)!.layersByView)).toEqual(['view-0']);
    expect(parseDesign(raw)!.layersByView['view-0'][0].id).toBe('a');
  });
  it('ignores view keys that are not view-<digits>', () => {
    const raw = JSON.stringify({ parentProductId: 'p', size: 'M', layersByView: { 'view-0': [img('a')], __proto__x: [img('b')], 'view-': [img('c')], constructor: [img('d')] } });
    expect(Object.keys(parseDesign(raw)!.layersByView)).toEqual(['view-0']);
  });
  it('de-duplicates layer ids within a view', () => {
    const raw = JSON.stringify({ parentProductId: 'p', size: 'M', layersByView: { 'view-0': [img('a'), img('a')] } });
    expect(parseDesign(raw)!.layersByView['view-0']).toHaveLength(1);
  });
});

describe('pruneLayersByView', () => {
  const l = [createImageLayer({ id: 'a', name: 'a', src: 'data:image/png;base64,AA', aspect: 1 })];
  it('keeps only known views and drops empty lists', () => {
    expect(pruneLayersByView({ 'view-0': l, 'view-1': l, 'view-2': [] }, ['view-0', 'view-2'])).toEqual({ 'view-0': l });
  });
  it('returns {} when there are no views', () => {
    expect(pruneLayersByView({ 'view-0': l }, [])).toEqual({});
  });
});

describe('new layer fields in saved designs', () => {
  const img = (id: string, extra: Record<string, unknown> = {}) => ({ ...createImageLayer({ id, name: `${id}.png`, src: 'data:image/png;base64,AAAA', aspect: 1 }), ...extra });
  const parse = (layers: unknown[]) => parseDesign(JSON.stringify({ parentProductId: 'p', size: 'M', layersByView: { 'view-0': layers } }))!.layersByView['view-0'] ?? [];

  it('defaults missing fields on older layers', () => {
    const legacy = { type: 'text', id: 't', name: 'x', text: 'Hi', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111', x: 0.5, y: 0.5, scale: 0.4, rotation: 0 };
    expect(parse([legacy])[0]).toMatchObject({ opacity: 1, bold: false, italic: false, align: 'center', letterSpacing: 0 });
  });
  it('keeps valid new fields and sanitizes bad ones', () => {
    const t = { ...createTextLayer({ id: 't', text: 'Hi' }), bold: true, italic: true, align: 'right', letterSpacing: 9, opacity: 0 };
    expect(parse([t])[0]).toMatchObject({ bold: true, italic: true, align: 'right', letterSpacing: 0.5, opacity: 0.05 });
    expect(parse([{ ...t, align: 'justify' }])[0]).toMatchObject({ align: 'center' });
  });
  it('accepts multi-line text up to 200 chars and rejects longer', () => {
    expect(parse([createTextLayer({ id: 't', text: 'a\nb' })])).toHaveLength(1);
    expect(parse([{ ...createTextLayer({ id: 't', text: 'x' }), text: 'x'.repeat(201) }])).toHaveLength(0);
  });
  it('keeps a groupId only when 2+ layers share it and it is a valid id', () => {
    const out = parse([img('a', { groupId: 'g1' }), img('b', { groupId: 'g1' }), img('c', { groupId: 'lonely' }), img('d', { groupId: 'bad id!' })]);
    expect(out.map((l) => l.groupId)).toEqual(['g1', 'g1', undefined, undefined]);
  });
});
