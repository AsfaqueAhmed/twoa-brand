import { supabase } from '@/shared/infrastructure/supabase/client';
import type { ParentProduct } from '@/shared/domain/types';

function assembleParentProduct(row: Record<string, any>, stockRows: Record<string, any>[]): ParentProduct {
  const sizeOrder: string[] = Array.isArray(row.size_order) ? row.size_order : [];
  const stockBySizeMap = new Map(stockRows.map((s) => [s.size, Number(s.stock) || 0]));
  const stockBySize: Record<string, number> = {};
  for (const size of sizeOrder) {
    stockBySize[size] = stockBySizeMap.get(size) ?? 0;
  }
  return { id: row.id, name: row.name || '', sizeOrder, stockBySize };
}

export async function fetchParentProductById(id: string): Promise<ParentProduct | null> {
  const { data: row, error } = await supabase.from('parent_products').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const { data: stockRows, error: stockError } = await supabase
    .from('parent_product_size_stock')
    .select('*')
    .eq('parent_id', id);
  if (stockError) throw stockError;

  return assembleParentProduct(row, stockRows || []);
}

export async function fetchAllParentProducts(): Promise<ParentProduct[]> {
  const [{ data: rows, error }, { data: stockRows, error: stockError }] = await Promise.all([
    supabase.from('parent_products').select('*'),
    supabase.from('parent_product_size_stock').select('*'),
  ]);
  if (error) throw error;
  if (stockError) throw stockError;

  const stockByParent = new Map<string, Record<string, any>[]>();
  for (const stock of stockRows || []) {
    const list = stockByParent.get(stock.parent_id) ?? [];
    list.push(stock);
    stockByParent.set(stock.parent_id, list);
  }

  return (rows || []).map((row) => assembleParentProduct(row, stockByParent.get(row.id) ?? []));
}
