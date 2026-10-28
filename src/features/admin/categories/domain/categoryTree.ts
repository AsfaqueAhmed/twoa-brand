import type { Product, ParentProduct } from '@/shared/domain/types';
import { categorySlug } from '@/features/catalog/domain/categorySlug';
import type { CategoryDoc } from '@/features/catalog/infrastructure/firestoreCategoriesRepository';

export type SubNode = { name: string; productCount: number; parentCount: number; persisted: boolean };

export type CategoryNode = {
  id: string;
  name: string;
  productCount: number;
  parentCount: number;
  persisted: boolean;
  subcategories: SubNode[];
};

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.toLowerCase().localeCompare(b.name.toLowerCase());

export function buildCategoryTree(
  categories: CategoryDoc[],
  products: Pick<Product, 'category' | 'subcategory'>[],
  parents: Pick<ParentProduct, 'category' | 'subcategory'>[] = [],
): CategoryNode[] {
  const nodes = new Map<string, CategoryNode & { subs: Map<string, SubNode> }>();

  // Nodes are keyed by exact stored name, matching exact-match product counts and server-side delete counts.
  const ensure = (name: string, persisted: boolean, id?: string) => {
    let node = nodes.get(name);
    if (!node) {
      node = { id: id ?? categorySlug(name), name, productCount: 0, parentCount: 0, persisted, subcategories: [], subs: new Map() };
      nodes.set(name, node);
    }
    return node;
  };
  const ensureSub = (node: ReturnType<typeof ensure>, name: string, persisted: boolean) => {
    let sub = node.subs.get(name);
    if (!sub) {
      sub = { name, productCount: 0, parentCount: 0, persisted };
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
  for (const pp of parents) {
    if (!pp.category || !pp.category.trim()) continue;
    const node = ensure(pp.category, false);
    node.parentCount += 1;
    if (pp.subcategory && pp.subcategory.trim()) ensureSub(node, pp.subcategory, false).parentCount += 1;
  }

  return Array.from(nodes.values())
    .map(({ subs, ...node }) => ({ ...node, subcategories: Array.from(subs.values()).sort(byName) }))
    .sort(byName);
}
