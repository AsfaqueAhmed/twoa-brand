import { isValidCategoryName } from '@/features/admin/inventory/domain/category';

export const UNCATEGORIZED = 'Uncategorized';

type CategoryLike = { name: string; subcategories: string[] };

export function validateParentCategory(category: string, subcategory: string, categories: CategoryLike[]): string | null {
  if (!isValidCategoryName(category)) return 'Please select a category.';
  const sub = subcategory.trim();
  if (sub) {
    const known = categories.find((c) => c.name === category.trim());
    if (!known || !known.subcategories.includes(sub)) {
      return `Subcategory "${sub}" does not belong to category "${category.trim()}".`;
    }
  }
  return null;
}

// The exact column values written to parent_products and copied onto linked products.
export function categoryColumns(category?: string, subcategory?: string): { category: string; subcategory: string | null } {
  return { category: (category ?? '').trim(), subcategory: (subcategory ?? '').trim() || null };
}

export function parentCategoryLabel(category?: string): string {
  return category?.trim() ? category : UNCATEGORIZED;
}

export function parentCategoryOptions(categories: CategoryLike[], current: string): string[] {
  return Array.from(new Set([...categories.map((c) => c.name), ...(current ? [current] : [])])).sort();
}
