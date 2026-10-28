import { supabase } from '@/shared/infrastructure/supabase/client';
import { categorySlug } from '@/features/catalog/domain/categorySlug';

// True when any product or parent product uses the category (and subcategory, when given).
async function countInUse(category: string, sub?: string): Promise<boolean> {
  for (const table of ['products', 'parent_products']) {
    let q = supabase.from(table).select('id', { count: 'exact', head: true }).eq('category', category);
    if (sub !== undefined) q = q.eq('subcategory', sub);
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 0) return true;
  }
  return false;
}

export async function deleteCategory(category: { id: string; name: string }): Promise<void> {
  const inUse = await countInUse(category.name);
  if (inUse) throw new Error('Category still has products or parent products.');

  const { error } = await supabase.from('categories').delete().eq('id', category.id);
  if (error) throw new Error(error.message);
}

export async function deleteSubcategory(categoryName: string, sub: string): Promise<void> {
  const inUse = await countInUse(categoryName, sub);
  if (inUse) throw new Error('Subcategory still has products or parent products.');

  const id = categorySlug(categoryName);
  const { data: row, error: fetchError } = await supabase
    .from('categories')
    .select('subcategories')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!row) return;

  const subcategories = ((row.subcategories as string[] | null) || []).filter((s) => s !== sub);
  const { error } = await supabase.from('categories').update({ subcategories }).eq('id', id);
  if (error) throw new Error(error.message);
}
