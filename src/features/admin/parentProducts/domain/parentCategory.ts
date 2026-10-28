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

// The category a product inherits from its parent; an error message when it can't be resolved safely.
export function resolveProductCategory(
  parent: { category?: string; subcategory?: string } | undefined | null,
): { category: string; subcategory: string } | { error: string } {
  if (!parent) return { error: 'Parent product not loaded. Reload and retry.' };
  const category = (parent.category ?? '').trim();
  if (!category) return { error: 'This parent product has no category. Set one on the Parent Products page first.' };
  return { category, subcategory: (parent.subcategory ?? '').trim() };
}

export function parentCategoryLabel(category?: string): string {
  return category?.trim() ? category : UNCATEGORIZED;
}

export function parentCategoryOptions(categories: CategoryLike[], current: string): string[] {
  return Array.from(new Set([...categories.map((c) => c.name), ...(current ? [current] : [])])).sort();
}
