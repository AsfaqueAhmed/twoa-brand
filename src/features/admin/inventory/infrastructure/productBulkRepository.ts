import { supabase } from '@/shared/infrastructure/supabase/client';
import { nextStock, type StockAdjustMode } from '../domain/productList';

export async function setProductFeatured(id: string, featured: boolean): Promise<void> {
  const { error } = await supabase.from('products').update({ is_featured: featured }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setProductsActive(ids: string[], active: boolean): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('products').update({ is_active: active }).in('id', ids);
  if (error) throw new Error(error.message);
}

export async function changeProductsCategory(ids: string[], category: string, subcategory: string): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('products')
    .update({ category, subcategory: subcategory.trim() ? subcategory : null })
    .in('id', ids);
  if (error) throw new Error(error.message);
}

export async function deleteProducts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('products').delete().in('id', ids);
  if (error) throw new Error(error.message);
}

// Read-modify-write per size row; concurrent edits to the same rows can race.
export async function adjustParentStock(parentIds: string[], mode: StockAdjustMode, amount: number): Promise<void> {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Enter a whole number of 0 or more.');
  if (parentIds.length === 0) return;

  const { data, error } = await supabase
    .from('parent_product_size_stock')
    .select('parent_id, size, stock')
    .in('parent_id', parentIds);
  if (error) throw new Error(error.message);

  const rows = (data || []).map((r) => ({
    parent_id: r.parent_id as string,
    size: r.size as string,
    stock: nextStock(Number(r.stock) || 0, mode, amount),
  }));
  if (rows.length === 0) return;

  const { error: upsertError } = await supabase
    .from('parent_product_size_stock')
    .upsert(rows, { onConflict: 'parent_id,size' });
  if (upsertError) throw new Error(upsertError.message);
}
