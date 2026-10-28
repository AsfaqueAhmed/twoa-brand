import { supabase } from '@/shared/infrastructure/supabase/client';
import { categorySlug } from '@/features/catalog/domain/categorySlug';

export async function deleteCategory(category: { id: string; name: string }): Promise<void> {
  const { count, error: countError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category', category.name);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) throw new Error('Category still has products.');

  const { error } = await supabase.from('categories').delete().eq('id', category.id);
  if (error) throw new Error(error.message);
}

export async function deleteSubcategory(categoryName: string, sub: string): Promise<void> {
  const { count, error: countError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category', categoryName)
    .eq('subcategory', sub);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) throw new Error('Subcategory still has products.');

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
