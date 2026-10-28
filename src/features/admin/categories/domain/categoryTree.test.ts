import { describe, it, expect } from 'vitest';
import { buildCategoryTree } from './categoryTree';

const cats = [
  { id: 'men', name: 'Men', subcategories: ['Shirts', 'pants'] },
  { id: 'women', name: 'Women', subcategories: [] },
];

describe('buildCategoryTree', () => {
  it('counts products per category and subcategory', () => {
    const tree = buildCategoryTree(cats, [
      { category: 'Men', subcategory: 'Shirts' },
      { category: 'Men', subcategory: 'Shirts' },
      { category: 'Men' },
      { category: 'Women', subcategory: '' },
    ]);
    const men = tree.find((c) => c.name === 'Men')!;
    expect(men.productCount).toBe(3);
    expect(men.subcategories.find((s) => s.name === 'Shirts')!.productCount).toBe(2);
    expect(men.subcategories.find((s) => s.name === 'pants')!.productCount).toBe(0);
    expect(tree.find((c) => c.name === 'Women')!.productCount).toBe(1);
  });

  it('includes product-derived entries missing from the table as not persisted', () => {
    const tree = buildCategoryTree(cats, [
      { category: 'Kids Wear', subcategory: 'Caps' },
      { category: 'Men', subcategory: 'Jackets' },
    ]);
    const kids = tree.find((c) => c.name === 'Kids Wear')!;
    expect(kids).toMatchObject({ id: 'kids-wear', persisted: false, productCount: 1 });
    expect(kids.subcategories).toEqual([{ name: 'Caps', productCount: 1, parentCount: 0, persisted: false }]);
    const men = tree.find((c) => c.name === 'Men')!;
    expect(men.persisted).toBe(true);
    expect(men.subcategories.find((s) => s.name === 'Jackets')!.persisted).toBe(false);
    expect(men.subcategories.find((s) => s.name === 'Shirts')!.persisted).toBe(true);
  });

  it('counts parent products per category and subcategory, including unpersisted ones', () => {
    const tree = buildCategoryTree(
      cats,
      [],
      [
        { category: 'Men', subcategory: 'Shirts' },
        { category: 'Men' },
        { category: 'Hats', subcategory: 'Caps' },
        { category: '  ' },
      ],
    );
    const men = tree.find((c) => c.name === 'Men')!;
    expect(men.parentCount).toBe(2);
    expect(men.productCount).toBe(0);
    expect(men.subcategories.find((s) => s.name === 'Shirts')!.parentCount).toBe(1);
    expect(men.subcategories.find((s) => s.name === 'pants')!.parentCount).toBe(0);
    const hats = tree.find((c) => c.name === 'Hats')!;
    expect(hats).toMatchObject({ persisted: false, parentCount: 1 });
    expect(hats.subcategories[0]).toMatchObject({ name: 'Caps', parentCount: 1 });
  });

  it('sorts categories and subcategories case-insensitively', () => {
    const tree = buildCategoryTree(
      [{ id: 'b', name: 'banana', subcategories: ['b', 'A', 'c'] }, { id: 'a', name: 'Apple', subcategories: [] }],
      [],
    );
    expect(tree.map((c) => c.name)).toEqual(['Apple', 'banana']);
    expect(tree[1].subcategories.map((s) => s.name)).toEqual(['A', 'b', 'c']);
  });

  it('ignores blank names and blank/undefined subcategories', () => {
    const tree = buildCategoryTree(
      [{ id: 'x', name: 'X', subcategories: ['  ', 'Y'] }],
      [{ category: '  ' }, { category: 'X', subcategory: '   ' }, { category: 'X', subcategory: undefined }],
    );
    expect(tree).toHaveLength(1);
    expect(tree[0].productCount).toBe(2);
    expect(tree[0].subcategories.map((s) => s.name)).toEqual(['Y']);
  });
});
