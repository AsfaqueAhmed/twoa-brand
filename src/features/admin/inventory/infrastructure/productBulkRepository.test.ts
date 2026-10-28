import { describe, it, expect, vi, beforeEach } from 'vitest';

const from = vi.fn();
vi.mock('@/shared/infrastructure/supabase/client', () => ({ supabase: { from: (...a: unknown[]) => from(...a) } }));

import { adjustParentStock, changeProductsCategory, deleteProducts, setProductsActive } from './productBulkRepository';

beforeEach(() => from.mockReset());

describe('productBulkRepository guards', () => {
  it('no-ops on empty id lists without touching the network', async () => {
    await setProductsActive([], true);
    await changeProductsCategory([], 'Hats', '');
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

  it('surfaces database errors', async () => {
    from.mockImplementation(() => ({ select: () => ({ in: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }) }) }));
    await expect(adjustParentStock(['p1'], 'set', 1)).rejects.toThrow('boom');
  });
});
