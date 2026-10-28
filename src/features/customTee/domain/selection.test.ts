import { describe, it, expect } from 'vitest';
import type { ParentProduct } from '@/shared/domain/types';
import {
  EMPTY_SELECTION,
  eligibleCategories,
  eligibleSubcategories,
  eligibleSizes,
  eligibleParents,
  selectCategory,
  selectSubcategory,
  selectSize,
  selectParent,
  isComplete,
  validateSelection,
  selectableParents,
} from './selection';

const parent = (id: string, category: string, subcategory: string, stockBySize: Record<string, number>): ParentProduct => ({
  id,
  name: id,
  category,
  subcategory,
  sizeOrder: Object.keys(stockBySize),
  stockBySize,
});

const parents = [
  parent('a', 'T-Shirts', 'Graphic', { S: 0, M: 45, L: 2 }),
  parent('b', 'T-Shirts', 'Graphic', { S: 3, M: 0, L: 0 }),
  parent('c', 'T-Shirts', 'Plain', { M: 5 }),
  parent('d', 'Hoodies', 'Zip', { M: 0 }),
  parent('e', 'Caps', '', { M: 9 }),
];

describe('eligibility', () => {
  it('lists categories that have stock somewhere, sorted, ignoring blank', () => {
    expect(eligibleCategories(parents)).toEqual(['Caps', 'T-Shirts']);
  });
  it('lists non-empty subcategories of a category with stock', () => {
    expect(eligibleSubcategories(parents, 'T-Shirts')).toEqual(['Graphic', 'Plain']);
    expect(eligibleSubcategories(parents, 'Hoodies')).toEqual([]);
  });
  it('lists only sizes with stock among matches, in canonical order', () => {
    expect(eligibleSizes(parents, 'T-Shirts', 'Graphic')).toEqual(['S', 'M', 'L']);
    expect(eligibleSizes(parents, 'T-Shirts', 'Plain')).toEqual(['M']);
    expect(eligibleSizes(parents, 'Hoodies', 'Zip')).toEqual([]);
  });
  it('lists parents with stock in the size', () => {
    expect(eligibleParents(parents, 'T-Shirts', 'Graphic', 'M').map((p) => p.id)).toEqual(['a']);
    expect(eligibleParents(parents, 'T-Shirts', 'Graphic', 'S').map((p) => p.id)).toEqual(['b']);
    expect(eligibleParents(parents, 'T-Shirts', 'Graphic', 'XL')).toEqual([]);
  });
});

describe('reducers', () => {
  const full = { category: 'T-Shirts', subcategory: 'Graphic', size: 'M', parentId: 'a' };
  it('changing category clears everything after it', () => {
    expect(selectCategory(full, 'Caps')).toEqual({ ...EMPTY_SELECTION, category: 'Caps' });
  });
  it('changing subcategory clears size and parent', () => {
    expect(selectSubcategory(full, 'Plain')).toEqual({ category: 'T-Shirts', subcategory: 'Plain', size: '', parentId: '' });
  });
  it('changing size clears parent', () => {
    expect(selectSize(full, 'L')).toEqual({ ...full, size: 'L', parentId: '' });
  });
  it('selecting a parent only sets the parent', () => {
    expect(selectParent({ ...full, parentId: '' }, 'a')).toEqual(full);
  });
  it('isComplete requires all four', () => {
    expect(isComplete(full)).toBe(true);
    expect(isComplete({ ...full, parentId: '' })).toBe(false);
  });
});

describe('validateSelection', () => {
  const full = { category: 'T-Shirts', subcategory: 'Graphic', size: 'M', parentId: 'a' };
  it('accepts a valid selection', () => {
    expect(validateSelection(parents, full)).toEqual({ ok: true });
  });
  it('resets to size when the chosen size no longer has stock anywhere', () => {
    const drained = parents.map((p) => (p.id === 'a' ? parent('a', 'T-Shirts', 'Graphic', { S: 0, M: 0, L: 2 }) : p));
    const result = validateSelection(drained, full);
    expect(result).toMatchObject({ ok: false, resetTo: 'size' });
  });
  it('resets to parent when only the parent vanished but the size is still available', () => {
    const gone = parents.filter((p) => p.id !== 'a').concat(parent('z', 'T-Shirts', 'Graphic', { M: 1 }));
    expect(validateSelection(gone, full)).toMatchObject({ ok: false, resetTo: 'parent' });
  });
  it('resets to category when the category no longer exists', () => {
    expect(validateSelection([], full)).toMatchObject({ ok: false, resetTo: 'category' });
  });
  it('resets to the first missing step for an incomplete selection', () => {
    expect(validateSelection(parents, { ...full, parentId: '' })).toMatchObject({ ok: false, resetTo: 'parent' });
    expect(validateSelection(parents, EMPTY_SELECTION)).toMatchObject({ ok: false, resetTo: 'category' });
  });
});

describe('selectableParents', () => {
  it('keeps imaged parents and drops empty, whitespace-only and undefined images', () => {
    const withImg = (id: string, image?: string): ParentProduct => ({ ...parent(id, 'T-Shirts', 'Graphic', { M: 1 }), image });
    const out = selectableParents([withImg('a', 'a.jpg'), withImg('b', ''), withImg('c', '   '), withImg('d', undefined), withImg('e', ' e.jpg ')]);
    expect(out.map((p) => p.id)).toEqual(['a', 'e']);
  });
});
