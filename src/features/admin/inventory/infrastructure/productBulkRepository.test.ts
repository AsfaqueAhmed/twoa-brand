import { describe, it, expect, vi, beforeEach } from 'vitest';

const from = vi.fn();
vi.mock('@/shared/infrastructure/supabase/client', () => ({ supabase: { from: (...a: unknown[]) => from(...a) } }));

import { adjustParentStock, changeParentsCategory, deleteProducts, setProductsActive } from './productBulkRepository';

beforeEach(() => from.mockReset());

describe('productBulkRepository guards', () => {
  it('no-ops on empty id lists without touching the network', async () => {
    await setProductsActive([], true);
    await changeParentsCategory([], 'Hats', '');
    await deleteProducts([]);
    await adjustParentStock([], 'set', 5);
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects invalid stock amounts before any request', async () => {
    for (const bad of [-1, 1.5, NaN]) {
      await expect(adjustParentStock(['p1'], 'set', bad)).rejects.toThrow(/whole number/);
    }
    expect(from).not.toHaveBeenCalled();
  });

  it('upserts computed stock per size row', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const inFn = vi.fn().mockResolvedValue({
      data: [{ parent_id: 'p1', size: 'S', stock: 5 }, { parent_id: 'p1', size: 'M', stock: 1 }],
      error: null,
    });
    from.mockImplementation(() => ({ select: () => ({ in: inFn }), upsert }));
    await adjustParentStock(['p1'], 'remove', 3);
    expect(upsert).toHaveBeenCalledWith(
      [{ parent_id: 'p1', size: 'S', stock: 2 }, { parent_id: 'p1', size: 'M', stock: 0 }],
      { onConflict: 'parent_id,size' }
    );
  });

  it('skips the upsert when there are no stock rows', async () => {
    const upsert = vi.fn();
    from.mockImplementation(() => ({ select: () => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }), upsert }));
    await adjustParentStock(['p1'], 'add', 3);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('updates parents then cascades category to their linked products', async () => {
    const calls: string[] = [];
    const mk = (table: string) => ({
      update: (v: unknown) => ({
        in: (col: string, ids: string[]) => {
          calls.push(`${table}:${JSON.stringify(v)}:${col}:${ids.join(',')}`);
          return Promise.resolve({ error: null });
        },
      }),
    });
    from.mockImplementation(mk);
    await changeParentsCategory(['a', 'b'], ' Hats ', '');
    expect(calls).toEqual([
      'parent_products:{"category":"Hats","subcategory":null}:id:a,b',
      'products:{"category":"Hats","subcategory":null}:parent_product_id:a,b',
    ]);
  });

  it('does not cascade when the parent update fails', async () => {
    from.mockImplementation(() => ({ update: () => ({ in: () => Promise.resolve({ error: { message: 'nope' } }) }) }));
    await expect(changeParentsCategory(['a'], 'Hats', '')).rejects.toThrow('nope');
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('reports a partial failure when the cascade to linked products fails', async () => {
    from.mockImplementation((table: string) => ({
      update: () => ({ in: () => Promise.resolve({ error: table === 'products' ? { message: 'cascade boom' } : null }) }),
    }));
    await expect(changeParentsCategory(['a'], 'Hats', '')).rejects.toThrow(
      'Parents updated, but linked products failed. Retry to finish. cascade boom',
    );
  });

  it('surfaces database errors', async () => {
    from.mockImplementation(() => ({ select: () => ({ in: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }) }) }));
    await expect(adjustParentStock(['p1'], 'set', 1)).rejects.toThrow('boom');
  });
});
