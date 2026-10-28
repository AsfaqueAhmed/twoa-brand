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

  const photos: string[] = [];
  const addPhoto = (url?: string) => {
    if (url && !photos.includes(url)) photos.push(url);
  };
  addPhoto(parent.image);
  for (const p of linked) {
    addPhoto(p.image);
    (p.gallery ?? []).forEach(addPhoto);
  }

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

  return { parent, code: parent.id.slice(0, 6).toUpperCase(), photos, colors, stock: parent.stockBySize[size] ?? 0 };
}
