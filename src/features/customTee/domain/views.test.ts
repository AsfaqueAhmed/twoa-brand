import { describe, it, expect } from 'vitest';
import type { ParentProduct } from '@/shared/domain/types';
import { buildViews, viewIdAt } from './views';

const base: ParentProduct = { id: 'p', name: 'Tee', image: 'p.jpg', category: 'T', sizeOrder: ['M'], stockBySize: { M: 1 } };

describe('buildViews', () => {
  it('falls back to the single image as the Front view', () => {
    expect(buildViews(base)).toEqual([{ id: 'view-0', label: 'Front', image: 'p.jpg' }]);
  });
  it('builds one view per titled image with positional ids', () => {
    const parent = { ...base, images: [{ title: 'Front', url: 'f.jpg' }, { title: 'Back', url: 'b.jpg' }, { title: 'Left sleeve', url: 'l.jpg' }] };
    expect(buildViews(parent)).toEqual([
      { id: 'view-0', label: 'Front', image: 'f.jpg' },
      { id: 'view-1', label: 'Back', image: 'b.jpg' },
      { id: 'view-2', label: 'Left sleeve', image: 'l.jpg' },
    ]);
  });
  it('applies the selected color variant image to the first view only', () => {
    const parent = { ...base, images: [{ title: 'Front', url: 'f.jpg' }, { title: 'Back', url: 'b.jpg' }] };
    const views = buildViews(parent, { id: 'v', name: 'Black', image: 'black.jpg' });
    expect(views.map((v) => v.image)).toEqual(['black.jpg', 'b.jpg']);
    expect(buildViews(parent, { id: 'v', name: 'Black' })[0].image).toBe('f.jpg');
  });
  it('returns no views when there is no image', () => {
    expect(buildViews({ ...base, image: '' })).toEqual([]);
  });
  it('viewIdAt is positional', () => {
    expect(viewIdAt(0)).toBe('view-0');
    expect(viewIdAt(3)).toBe('view-3');
  });
});
