import type { Product } from '@/shared/domain/types';

export function matchesSearch(product: Product, query: string): boolean {
  const q = query.toLowerCase();
  return product.name.toLowerCase().includes(q) || product.description.toLowerCase().includes(q);
}

export function filterProducts(
  products: Product[],
  opts: { search?: string; category?: string; subcategory?: string }
): Product[] {
  return products.filter((product) => {
    const matchesQuery = !opts.search || matchesSearch(product, opts.search);
    const matchesCategory = !opts.category || opts.category === 'All' || product.category === opts.category;
    const matchesSubcategory =
      !opts.subcategory || opts.subcategory === 'All' || product.subcategory === opts.subcategory;
    return matchesQuery && matchesCategory && matchesSubcategory;
  });
}

