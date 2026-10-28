import type { Product } from '@/shared/domain/types';
import { categorySlug } from '@/features/catalog/domain/categorySlug';
import type { CategoryDoc } from '@/features/catalog/infrastructure/firestoreCategoriesRepository';

export type CategoryNode = {
  id: string;
  name: string;
  productCount: number;
  persisted: boolean;
  subcategories: { name: string; productCount: number; persisted: boolean }[];
};

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.toLowerCase().localeCompare(b.name.toLowerCase());

export function buildCategoryTree(
  categories: CategoryDoc[],
  products: Pick<Product, 'category' | 'subcategory'>[],
): CategoryNode[] {
  const nodes = new Map<string, CategoryNode & { subs: Map<string, { name: string; productCount: number; persisted: boolean }> }>();

  // Nodes are keyed by exact stored name, matching exact-match product counts and server-side delete counts.
  const ensure = (name: string, persisted: boolean, id?: string) => {
    let node = nodes.get(name);
    if (!node) {
      node = { id: id ?? categorySlug(name), name, productCount: 0, persisted, subcategories: [], subs: new Map() };
      nodes.set(name, node);
    }
    return node;
  };
  const ensureSub = (node: ReturnType<typeof ensure>, name: string, persisted: boolean) => {
    let sub = node.subs.get(name);
    if (!sub) {
      sub = { name, productCount: 0, persisted };
      node.subs.set(name, sub);
    }
    return sub;
  };

  for (const c of categories) {
    if (!c.name.trim()) continue;
    const node = ensure(c.name, true, c.id);
    for (const s of c.subcategories) if (s.trim()) ensureSub(node, s, true);
  }
  for (const p of products) {
    if (!p.category || !p.category.trim()) continue;
    const node = ensure(p.category, false);
    node.productCount += 1;
    if (p.subcategory && p.subcategory.trim()) ensureSub(node, p.subcategory, false).productCount += 1;
  }

  return Array.from(nodes.values())
    .map(({ subs, ...node }) => ({ ...node, subcategories: Array.from(subs.values()).sort(byName) }))
    .sort(byName);
}
