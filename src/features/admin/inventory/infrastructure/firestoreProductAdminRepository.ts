import { supabase } from '@/shared/infrastructure/supabase/client';
import type { ProductHighlight, ProductVariant } from '@/shared/domain/types';
import { normalizeHighlights } from '@/features/product/domain/highlights';

export interface ProductPayload {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number | null;
  image: string;
  category: string;
  subcategory: string;
  rating: number;
  parentProductId: string | null;
  variants: ProductVariant[];
  sizeChartId: string | null;
  // Optional: when omitted the stored values are left untouched by the upsert.
  gallery?: string[];
  highlights?: ProductHighlight[];
}

export async function saveProduct(payload: ProductPayload): Promise<void> {
  const { error } = await supabase.from('products').upsert({
    id: payload.id,
    name: payload.name,
    description: payload.description,
    price: payload.price,
    original_price: payload.originalPrice,
    image_url: payload.image,
    category: payload.category,
    subcategory: payload.subcategory || null,
    rating: payload.rating,
    parent_product_id: payload.parentProductId,
    variants:
      payload.variants.length > 0
        ? payload.variants.map((v) => ({ id: v.id, name: v.name, colorCode: v.colorCode ?? null, image_url: v.image ?? null }))
        : null,
    size_chart_id: payload.sizeChartId,
    ...(payload.gallery !== undefined ? { gallery: payload.gallery.filter(Boolean) } : {}),
    ...(payload.highlights !== undefined ? { highlights: normalizeHighlights(payload.highlights) } : {}),
  });
  if (error) throw error;
}

export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw error;
}
