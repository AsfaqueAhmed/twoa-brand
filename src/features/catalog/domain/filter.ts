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

export function getCategories(products: Product[]): string[] {
  return ['All', ...Array.from(new Set(products.map((p) => p.category)))];
}

export function getSubcategories(products: Product[], category: string): string[] {
  return [
    'All',
    ...Array.from(
      new Set(
        products
          .filter((p) => p.category === category)
          .map((p) => p.subcategory)
          .filter((sub): sub is string => !!sub)
      )
    ),
  ];
}
