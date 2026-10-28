import { categorySlug } from '@/features/catalog/domain/categorySlug';

const EMPTY_SLUG = 'Enter a name with letters or numbers.';

export function validateNewCategory(name: string, tree: { id: string; name: string }[]): string | null {
  const slug = categorySlug(name);
  if (!slug) return EMPTY_SLUG;
  const lower = name.toLowerCase();
  if (tree.some((c) => c.name.toLowerCase() === lower || c.id === slug)) {
    return 'A category with a similar name already exists.';
  }
  return null;
}

export function validateNewSubcategory(
  sub: string,
  node: { name: string; subcategories: { name: string }[] },
): string | null {
  if (!categorySlug(node.name)) return EMPTY_SLUG;
  const lower = sub.toLowerCase();
  if (node.subcategories.some((s) => s.name.toLowerCase() === lower)) return 'That subcategory already exists.';
  return null;
}
