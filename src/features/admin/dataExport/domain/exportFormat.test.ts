import { describe, it, expect } from 'vitest';
import { EXPORT_TABLES, PRODUCT_CSV_COLUMNS, buildExportFile, toCsv } from './exportFormat';

describe('EXPORT_TABLES', () => {
  it('lists the ten tables and excludes backups', () => {
    expect(EXPORT_TABLES).toHaveLength(10);
    expect(EXPORT_TABLES.some((t) => t.startsWith('backup_'))).toBe(false);
    expect(EXPORT_TABLES[0]).toBe('categories');
    expect(EXPORT_TABLES[9]).toBe('size_charts');
  });
});

describe('buildExportFile', () => {
  const date = new Date(2026, 9, 5, 7, 3, 9);
  it('names the file with local date and time', () => {
    expect(buildExportFile({}, date).filename).toBe('twoa-export-2026-10-05-0703.json');
  });
  it('builds pretty JSON with counts', () => {
    const { json } = buildExportFile({ a: [{ x: 1 }, { x: 2 }], b: [] }, date);
    expect(json).toContain('\n  "tables"');
    const parsed = JSON.parse(json);
    expect(parsed.project).toBe('twoa-brand');
    expect(parsed.exportedAt).toBe(date.toISOString());
    expect(parsed.counts).toEqual({ a: 2, b: 0 });
    expect(parsed.tables.a).toEqual([{ x: 1 }, { x: 2 }]);
  });
  it('preserves unicode', () => {
    const parsed = JSON.parse(buildExportFile({ a: [{ n: '৳ বাংলা' }] }, date).json);
    expect(parsed.tables.a[0].n).toBe('৳ বাংলা');
  });
});

describe('toCsv', () => {
  it('writes only the header for empty rows', () => {
    expect(toCsv([], ['a', 'b'])).toBe('a,b');
  });
  it('uses CRLF line endings without trailing newline', () => {
    expect(toCsv([{ a: 1, b: 2 }, { a: 3, b: 4 }], ['a', 'b'])).toBe('a,b\r\n1,2\r\n3,4');
  });
  it('quotes commas, quotes and newlines', () => {
    const csv = toCsv([{ a: 'x,y', b: 'say "hi"', c: 'l1\nl2', d: 'l1\r\nl2' }], ['a', 'b', 'c', 'd']);
    expect(csv).toBe('a,b,c,d\r\n"x,y","say ""hi""","l1\nl2","l1\r\nl2"');
  });
  it('quotes header names that need it', () => {
    expect(toCsv([], ['a,b'])).toBe('"a,b"');
  });
  it('renders null and undefined as empty and missing columns as empty', () => {
    expect(toCsv([{ a: null, b: undefined }], ['a', 'b', 'c'])).toBe('a,b,c\r\n,,');
  });
  it('stringifies objects and arrays as JSON with escaping', () => {
    expect(toCsv([{ a: { k: 'v' }, b: ['x', 'y'] }], ['a', 'b'])).toBe('a,b\r\n"{""k"":""v""}","[""x"",""y""]"');
  });
  it('keeps booleans and numbers as-is, including zero and false', () => {
    expect(toCsv([{ a: true, b: false, c: 0, d: 12.5 }], ['a', 'b', 'c', 'd'])).toBe('a,b,c,d\r\ntrue,false,0,12.5');
  });
  it('preserves unicode', () => {
    expect(toCsv([{ a: '৳৫০০ টাকা' }], ['a'])).toBe('a\r\n৳৫০০ টাকা');
  });
  it('ignores columns not requested', () => {
    expect(toCsv([{ a: 1, z: 9 }], ['a'])).toBe('a\r\n1');
  });
});

describe('PRODUCT_CSV_COLUMNS', () => {
  it('has the expected columns', () => {
    expect(PRODUCT_CSV_COLUMNS).toEqual([
      'id', 'name', 'description', 'category', 'subcategory', 'price', 'original_price',
      'image_url', 'rating', 'parent_product_id', 'size_chart_id', 'is_active', 'is_featured',
      'variants', 'gallery', 'highlights',
    ]);
  });
});
