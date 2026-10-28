import { describe, it, expect } from 'vitest';
import { validateNewCategory, validateNewSubcategory } from './validateCategory';

const tree = [
  { id: 'men', name: 'Men', subcategories: [{ name: 'Shirts' }] },
  { id: 't-shirt', name: 'T-Shirt', subcategories: [] },
];

describe('validateNewCategory', () => {
  it('accepts a new name', () => expect(validateNewCategory('Women', tree)).toBeNull());
  it('rejects exact and case-insensitive duplicates', () => {
    expect(validateNewCategory('men', tree)).toBe('A category with a similar name already exists.');
  });
  it('rejects slug collisions', () => {
    expect(validateNewCategory('T Shirt', tree)).toBe('A category with a similar name already exists.');
  });
  it('rejects names with an empty slug', () => {
    expect(validateNewCategory('!!!', tree)).toBe('Enter a name with letters or numbers.');
  });
});

describe('validateNewSubcategory', () => {
  const men = tree[0];
  it('accepts a new subcategory', () => expect(validateNewSubcategory('Pants', men)).toBeNull());
  it('rejects case-insensitive duplicates', () => {
    expect(validateNewSubcategory('shirts', men)).toBe('That subcategory already exists.');
  });
  it('rejects when the parent slug is empty', () => {
    expect(validateNewSubcategory('Pants', { name: '!!!', subcategories: [] })).toBe('Enter a name with letters or numbers.');
  });
});
