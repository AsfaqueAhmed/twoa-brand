import { describe, it, expect } from 'vitest';
import type { ParentProduct } from '@/shared/domain/types';
import { buildViews } from './views';

const parent: ParentProduct = { id: 'p', name: 'Tee', image: 'p.jpg', category: 'T', sizeOrder: ['M'], stockBySize: { M: 1 } };

describe('buildViews', () => {
  it('returns only the front view from the parent image', () => {
    expect(buildViews(parent)).toEqual([{ id: 'front', label: 'Front', image: 'p.jpg' }]);
  });
  it('prefers the selected color variant image', () => {
    expect(buildViews(parent, { id: 'v', name: 'Black', image: 'black.jpg' })[0].image).toBe('black.jpg');
    expect(buildViews(parent, { id: 'v', name: 'Black' })[0].image).toBe('p.jpg');
  });
  it('returns no views when there is no image at all', () => {
    expect(buildViews({ ...parent, image: '' })).toEqual([]);
  });
});
