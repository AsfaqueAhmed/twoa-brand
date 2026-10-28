import { describe, it, expect, vi, beforeEach } from 'vitest';

const from = vi.fn();
vi.mock('@/shared/infrastructure/supabase/client', () => ({ supabase: { from: (...a: unknown[]) => from(...a) } }));

import { deleteCategory, deleteSubcategory } from './categoriesAdminRepository';

// Chainable count query: every .eq returns the builder; awaiting it resolves to the result.
const countQuery = (count: number, eqs: unknown[][] = []) => {
  const q: any = {
    select: () => q,
    eq: (...a: unknown[]) => { eqs.push(a); return q; },
    then: (res: (v: unknown) => unknown) => res({ count, error: null }),
  };
  return q;
};

beforeEach(() => from.mockReset());

describe('category delete guards', () => {
  it('refuses deleting a category used only by parent products', async () => {
    from.mockImplementation((t: string) => countQuery(t === 'parent_products' ? 2 : 0));
    await expect(deleteCategory({ id: 'men', name: 'Men' })).rejects.toThrow('Category still has products or parent products.');
    expect(from).toHaveBeenCalledWith('products');
    expect(from).toHaveBeenCalledWith('parent_products');
  });

  it('refuses deleting a category used by products', async () => {
    from.mockImplementation((t: string) => countQuery(t === 'products' ? 1 : 0));
    await expect(deleteCategory({ id: 'men', name: 'Men' })).rejects.toThrow('Category still has products or parent products.');
  });

  it('refuses deleting a subcategory used by a parent, filtering on category and subcategory', async () => {
    const eqs: unknown[][] = [];
    from.mockImplementation((t: string) => countQuery(t === 'parent_products' ? 1 : 0, t === 'parent_products' ? eqs : []));
    await expect(deleteSubcategory('Men', 'Shirts')).rejects.toThrow('Subcategory still has products or parent products.');
    expect(eqs).toEqual([['category', 'Men'], ['subcategory', 'Shirts']]);
  });

  it('deletes an unused category', async () => {
    const del = vi.fn(() => ({ eq: () => Promise.resolve({ error: null }) }));
    from.mockImplementation((t: string) => (t === 'categories' ? { delete: del } : countQuery(0)));
    await deleteCategory({ id: 'men', name: 'Men' });
    expect(del).toHaveBeenCalled();
  });
});
