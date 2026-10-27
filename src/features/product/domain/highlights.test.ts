import { describe, it, expect } from 'vitest';
import { normalizeHighlights, MAX_HIGHLIGHTS } from './highlights';

describe('normalizeHighlights', () => {
  it('keeps valid rows and trims strings', () => {
    expect(normalizeHighlights([{ icon: 'leaf', title: ' 180 GSM ', subtitle: ' Lycra Cotton ' }])).toEqual([
      { icon: 'leaf', title: '180 GSM', subtitle: 'Lycra Cotton' },
    ]);
  });

  it('drops rows without a title', () => {
    expect(normalizeHighlights([{ icon: 'leaf', title: '  ', subtitle: 'x' }, { icon: 'shirt', subtitle: 'y' }])).toEqual([]);
  });

  it('falls back to the default icon and an empty subtitle', () => {
    expect(normalizeHighlights([{ icon: 'nope', title: 'Fit' }])).toEqual([
      { icon: 'sparkles', title: 'Fit', subtitle: '' },
    ]);
  });

  it('ignores non-arrays and non-object entries', () => {
    expect(normalizeHighlights(null)).toEqual([]);
    expect(normalizeHighlights('x')).toEqual([]);
    expect(normalizeHighlights([null, 5, 'a', { title: 'Ok' }])).toEqual([
      { icon: 'sparkles', title: 'Ok', subtitle: '' },
    ]);
  });

  it('caps the list at MAX_HIGHLIGHTS', () => {
    const rows = Array.from({ length: MAX_HIGHLIGHTS + 2 }, (_, i) => ({ icon: 'leaf', title: `T${i}` }));
    expect(normalizeHighlights(rows)).toHaveLength(MAX_HIGHLIGHTS);
  });
});
