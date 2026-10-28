import { supabase } from '@/shared/infrastructure/supabase/client';
import type { Product, ProductVariant } from '@/shared/domain/types';
import { normalizeHighlights } from '@/features/product/domain/highlights';

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
    gallery: Array.isArray(row.gallery) ? row.gallery.filter((u: unknown): u is string => typeof u === 'string' && !!u) : [],
    highlights: normalizeHighlights(row.highlights),
    isActive: row.is_active !== false,
    isFeatured: row.is_featured === true,
  };
}

// Storefront: active products only.
export async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: true });
  if (error) throw error;
  return (data || []).map(toProduct);
}

// Admin screens: every product, including hidden (inactive) ones.
export async function fetchAllProductsForAdmin(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
  if (error) throw error;
  return (data || []).map(toProduct);
}

// A product is purchasable only when its parent product still has stock in at
// least one size (see isProductOutOfStock). Parent products are few, so the ids
// of those with stock are fetched once and cached briefly; the catalog query
// then filters on them server-side so pages stay full and pagination works.
const IN_STOCK_CACHE_MS = 30_000;
let inStockParentIdsCache: { at: number; ids: Promise<string[]> } | null = null;

async function fetchInStockParentIds(): Promise<string[]> {
  if (inStockParentIdsCache && Date.now() - inStockParentIdsCache.at < IN_STOCK_CACHE_MS) {
    return inStockParentIdsCache.ids;
  }
  const ids = (async () => {
    const { data, error } = await supabase.from('parent_product_size_stock').select('parent_id').gt('stock', 0);
    if (error) throw error;
    return Array.from(new Set((data || []).map((row) => row.parent_id as string)));
  })();
  inStockParentIdsCache = { at: Date.now(), ids };
  ids.catch(() => {
    inStockParentIdsCache = null;
  });
  return ids;
}

export async function fetchProductsPage(
  pageSize: number,
  category: string | undefined,
  subcategory: string | undefined,
  cursor: ProductsPageCursor
): Promise<ProductsPage> {
  const inStockParentIds = await fetchInStockParentIds();
  if (inStockParentIds.length === 0) return { products: [], cursor, hasMore: false };

  let q = supabase
    .from('products')
    .select('*')
    .in('parent_product_id', inStockParentIds)
    .eq('is_active', true)
    .order('id', { ascending: true })
    .limit(pageSize);
  if (category && category !== 'All') q = q.eq('category', category);
  if (subcategory && subcategory !== 'All') q = q.eq('subcategory', subcategory);
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
  const { data, error } = await supabase.from('products').select('*').eq('id', id).eq('is_active', true).maybeSingle();
  if (error) throw error;
  return data ? toProduct(data) : null;
}
