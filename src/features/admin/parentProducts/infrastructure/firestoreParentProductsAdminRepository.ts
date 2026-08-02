import { supabase } from '@/shared/infrastructure/supabase/client';
import type { ParentProduct } from '@/shared/domain/types';
import { fetchAllParentProducts } from '@/features/catalog/infrastructure/firestoreParentProductsRepository';

export async function fetchParentProducts(): Promise<ParentProduct[]> {
  return fetchAllParentProducts();
}

export async function saveParentProduct(pp: ParentProduct, previousSizeOrder: string[]): Promise<void> {
  const { error: parentError } = await supabase
    .from('parent_products')
    .upsert({ id: pp.id, name: pp.name, size_order: pp.sizeOrder });
  if (parentError) throw parentError;

  const stockRows = pp.sizeOrder.map((size) => ({ parent_id: pp.id, size, stock: Number(pp.stockBySize[size]) || 0 }));
  if (stockRows.length > 0) {
    const { error: stockError } = await supabase
      .from('parent_product_size_stock')
      .upsert(stockRows, { onConflict: 'parent_id,size' });
    if (stockError) throw stockError;
  }

  const removedSizes = previousSizeOrder.filter((size) => !pp.sizeOrder.includes(size));
  if (removedSizes.length > 0) {
    const { error: deleteError } = await supabase
      .from('parent_product_size_stock')
      .delete()
      .eq('parent_id', pp.id)
      .in('size', removedSizes);
    if (deleteError) throw deleteError;
  }
}

// sizeOrder is unused now — the parent_product_size_stock rows cascade-delete
// with the parent row (ON DELETE CASCADE), unlike Firestore where each
// sizeStock subdocument had to be deleted individually. Kept in the
// signature so the call site (ParentProductManager.tsx) doesn't need to change.
export async function deleteParentProduct(id: string, sizeOrder: string[]): Promise<void> {
  const { count, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('parent_product_id', id);
  if (countError) throw countError;
  if (count && count > 0) {
    throw new Error(`Cannot delete: ${count} product(s) still reference this Parent Product. Unlink them first.`);
  }

  const { error } = await supabase.from('parent_products').delete().eq('id', id);
  if (error) throw error;
}
