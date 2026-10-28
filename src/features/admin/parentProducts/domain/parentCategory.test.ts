import { describe, it, expect } from 'vitest';
import {
  UNCATEGORIZED,
  categoryColumns,
  parentCategoryLabel,
  parentCategoryOptions,
  resolveProductCategory,
  validateParentCategory,
} from './parentCategory';

const cats = [
  { id: 'men', name: 'Men', subcategories: ['Shirts', 'Pants'] },
  { id: 'women', name: 'Women', subcategories: [] },
];

describe('validateParentCategory', () => {
  it('requires a category', () => {
    expect(validateParentCategory('', '', cats)).toMatch(/category/i);
    expect(validateParentCategory('   ', '', cats)).toMatch(/category/i);
  });
  it('accepts category with no subcategory', () => expect(validateParentCategory('Men', '', cats)).toBeNull());
  it('accepts a subcategory of the chosen category', () => expect(validateParentCategory('Men', 'Shirts', cats)).toBeNull());
  it('rejects a subcategory from another category', () =>
    expect(validateParentCategory('Women', 'Shirts', cats)).toMatch(/subcategory/i));
  it('accepts a legacy category not in the table when no subcategory', () =>
    expect(validateParentCategory('Legacy', '', cats)).toBeNull());
});

describe('categoryColumns', () => {
  it('trims and nulls a blank subcategory', () => {
    expect(categoryColumns(' Men ', '  ')).toEqual({ category: 'Men', subcategory: null });
    expect(categoryColumns('Men', ' Shirts ')).toEqual({ category: 'Men', subcategory: 'Shirts' });
    expect(categoryColumns(undefined, undefined)).toEqual({ category: '', subcategory: null });
  });
});

describe('parentCategoryLabel', () => {
  it('falls back to Uncategorized', () => expect(parentCategoryLabel('')).toBe(UNCATEGORIZED));
  it('returns the name', () => expect(parentCategoryLabel('Men')).toBe('Men'));
});

describe('parentCategoryOptions', () => {
  it('merges table names with the current value, sorted, unique', () => {
    expect(parentCategoryOptions(cats, 'Legacy')).toEqual(['Legacy', 'Men', 'Women']);
    expect(parentCategoryOptions(cats, 'Men')).toEqual(['Men', 'Women']);
    expect(parentCategoryOptions(cats, '')).toEqual(['Men', 'Women']);
  });
});

describe('resolveProductCategory', () => {
  it('errors when the parent is not loaded', () => {
    expect(resolveProductCategory(undefined)).toEqual({ error: 'Parent product not loaded. Reload and retry.' });
  });
  it('errors when the parent has no category', () => {
    expect(resolveProductCategory({ category: '  ' })).toEqual({
      error: 'This parent product has no category. Set one on the Parent Products page first.',
    });
    expect(resolveProductCategory({})).toHaveProperty('error');
  });
  it('returns trimmed category and subcategory', () => {
    expect(resolveProductCategory({ category: ' Hats ', subcategory: ' Caps ' })).toEqual({ category: 'Hats', subcategory: 'Caps' });
    expect(resolveProductCategory({ category: 'Hats' })).toEqual({ category: 'Hats', subcategory: '' });
  });
});
