import { supabase } from '@/shared/infrastructure/supabase/client';
import type { Product, ProductVariant } from '@/shared/domain/types';

// Cursor is the last-seen product id — products are ordered by id for stable
// keyset pagination (`.gt('id', cursor)` picks up where the previous page left off).
export type ProductsPageCursor = string | null;

export interface ProductsPage {
  products: Product[];
  cursor: ProductsPageCursor;
  hasMore: boolean;
}

function toVariant(v: Record<string, any>): ProductVariant {
  return { id: v.id, name: v.name, image: v.image_url || undefined, colorCode: v.colorCode ?? undefined };
}

function toProduct(row: Record<string, any>): Product {
  return {
    id: row.id,
    name: row.name || '',
    description: row.description || '',
    price: Number(row.price) || 0,
    originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    image: row.image_url || '',
    category: row.category || '',
    subcategory: row.subcategory || '',
    rating: Number(row.rating) || 5,
    parentProductId: row.parent_product_id || undefined,
    variants: Array.isArray(row.variants) ? row.variants.map(toVariant) : [],
    sizeChartId: row.size_chart_id || undefined,
  };
}

export async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
  if (error) throw error;
  return (data || []).map(toProduct);
}

export async function fetchProductsPage(
  pageSize: number,
  category: string | undefined,
  cursor: ProductsPageCursor
): Promise<ProductsPage> {
  let q = supabase.from('products').select('*').order('id', { ascending: true }).limit(pageSize);
  if (category && category !== 'All') q = q.eq('category', category);
  if (cursor) q = q.gt('id', cursor);

  const { data, error } = await q;
  if (error) throw error;
  const products = (data || []).map(toProduct);
  return {
    products,
    cursor: products.length > 0 ? products[products.length - 1].id : cursor,
    hasMore: products.length === pageSize,
  };
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toProduct(data) : null;
}
