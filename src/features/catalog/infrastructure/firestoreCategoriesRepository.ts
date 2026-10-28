import { supabase } from '@/shared/infrastructure/supabase/client';

export interface CategoryDoc {
  id: string;
  name: string;
  subcategories: string[];
}

import { categorySlug } from '@/features/catalog/domain/categorySlug';

export { categorySlug } from '@/features/catalog/domain/categorySlug';

export async function fetchCategories(): Promise<CategoryDoc[]> {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) throw error;
  return (data || []).map((row) => ({ id: row.id, name: row.name || row.id, subcategories: row.subcategories || [] }));
}

export async function persistNewCategory(name: string): Promise<void> {
  const id = categorySlug(name);
  if (!id) return;
  const { error } = await supabase.from('categories').upsert({ id, name, subcategories: [] }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function persistNewSubcategory(categoryName: string, subName: string): Promise<void> {
  const id = categorySlug(categoryName);
  if (!id) return;
  const { data: existing, error: fetchError } = await supabase
    .from('categories')
    .select('subcategories')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw fetchError;

  const subcategories = Array.from(new Set([...(existing?.subcategories || []), subName]));
  const { error } = await supabase.from('categories').upsert({ id, name: categoryName, subcategories });
  if (error) throw error;
}
