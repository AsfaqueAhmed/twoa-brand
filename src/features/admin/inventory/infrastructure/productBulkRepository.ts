import { supabase } from '@/shared/infrastructure/supabase/client';
import { categoryColumns } from '@/features/admin/parentProducts/domain/parentCategory';
import { cascadeCategoryToProducts } from '@/features/admin/parentProducts/infrastructure/firestoreParentProductsAdminRepository';
import { nextStock, validateStockAmount, type StockAdjustMode } from '../domain/productList';

export async function setProductFeatured(id: string, featured: boolean): Promise<void> {
  const { error } = await supabase.from('products').update({ is_featured: featured }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setProductsActive(ids: string[], active: boolean): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('products').update({ is_active: active }).in('id', ids);
  if (error) throw new Error(error.message);
}

// Categories belong to parent products: update the parents, then copy the values
// onto every linked product (the denormalized products.category/subcategory).
export async function changeParentsCategory(parentIds: string[], category: string, subcategory: string): Promise<void> {
  if (parentIds.length === 0) return;
  const cols = categoryColumns(category, subcategory);
  const { error } = await supabase.from('parent_products').update(cols).in('id', parentIds);
  if (error) throw new Error(error.message);
  try {
    await cascadeCategoryToProducts(parentIds, cols.category, cols.subcategory);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Parents updated, but linked products failed. Retry to finish. ${msg}`);
  }
}

export async function deleteProducts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('products').delete().in('id', ids);
  if (error) throw new Error(error.message);
}

// Read-modify-write per size row; concurrent edits to the same rows can race.
export async function adjustParentStock(parentIds: string[], mode: StockAdjustMode, amount: number): Promise<void> {
  const invalid = validateStockAmount(amount);
  if (invalid) throw new Error(invalid);
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
