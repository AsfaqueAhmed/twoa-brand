// Build-time generator for the Meta/Facebook product feed. Runs automatically
// before `next build` (see package.json "prebuild") so `public/product-feed.csv`
// is fresh on every deploy — no separate server or admin-triggered sync needed.
// Reads Supabase with the same public anon key the storefront itself uses
// (products/parent_product_size_stock are publicly readable per RLS), so no
// elevated credentials are required.
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://twoa-brand.web.app';
const BRAND_NAME = '2A';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function csvEscape(value) {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

async function fetchStockTotalsByParentId() {
  const { data, error } = await supabase.from('parent_product_size_stock').select('parent_id, stock');
  if (error) throw error;
  const totals = new Map();
  for (const row of data || []) {
    totals.set(row.parent_id, (totals.get(row.parent_id) ?? 0) + (Number(row.stock) || 0));
  }
  return totals;
}

function isOutOfStock(stockTotals, parentId) {
  if (!parentId || !stockTotals.has(parentId)) return true;
  return (stockTotals.get(parentId) ?? 0) <= 0;
}

async function main() {
  const [{ data: products, error }, stockTotals] = await Promise.all([
    supabase.from('products').select('id, name, description, price, image_url, parent_product_id'),
    fetchStockTotalsByParentId(),
  ]);
  if (error) throw error;

  if (!existsSync(PUBLIC_DIR)) mkdirSync(PUBLIC_DIR, { recursive: true });

  const headers = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'];
  const lines = [headers.join(',')];

  for (const product of products || []) {
    const row = {
      id: product.id,
      title: product.name || '',
      description: product.description || '',
      availability: isOutOfStock(stockTotals, product.parent_product_id) ? 'out of stock' : 'in stock',
      condition: 'new',
      price: `${(Number(product.price) || 0).toFixed(2)} BDT`,
      link: `${SITE_URL}/product?id=${encodeURIComponent(product.id)}`,
      image_link: product.image_url || '',
      brand: BRAND_NAME,
    };
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }

  writeFileSync(path.join(PUBLIC_DIR, 'product-feed.csv'), lines.join('\n'));
  console.log(`[product-feed] Generated product-feed.csv with ${(products || []).length} products.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[product-feed] Failed to generate product feed:', err);
  // Don't fail the whole build over the feed — the site itself doesn't depend on it.
  process.exit(0);
});
