import type { ParentProduct, Product, ProductVariant } from '@/shared/domain/types';

export interface ParentCardData {
  parent: ParentProduct;
  code: string;
  photos: string[];
  colors: ProductVariant[];
  stock: number;
}

export function buildParentCard(parent: ParentProduct, products: Product[], size: string): ParentCardData {
  const linked = products.filter((p) => p.parentProductId === parent.id);

  const photos: string[] = parent.image ? [parent.image] : [];

  const colors: ProductVariant[] = [];
  const seen = new Set<string>();
  for (const p of linked) {
    for (const v of p.variants ?? []) {
      const key = v.name.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        colors.push(v);
      }
    }
  }

  return { parent, code: parent.id.slice(-6).toUpperCase(), photos, colors, stock: parent.stockBySize[size] ?? 0 };
}
