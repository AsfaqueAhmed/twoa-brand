import { supabase } from '@/shared/infrastructure/supabase/client';
import { EXPORT_TABLES } from '../domain/exportFormat';

const PAGE = 1000;

// Stable ordering keys (primary keys) so paging never skips or repeats rows.
const ORDER_BY: Record<string, string[]> = {
  coupons: ['code'],
  parent_product_size_stock: ['parent_id', 'size'],
};

export async function fetchAllRows(table: string): Promise<unknown[]> {
  const keys = ORDER_BY[table] ?? ['id'];
  const all: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select('*');
    for (const k of keys) query = query.order(k, { ascending: true });
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

export async function fetchTableCounts(): Promise<Record<string, number>> {
  const entries = await Promise.all(
    EXPORT_TABLES.map(async (table) => {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) throw new Error(error.message);
      return [table, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries);
}
