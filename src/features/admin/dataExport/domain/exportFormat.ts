export const EXPORT_TABLES = [
  'categories',
  'coupons',
  'home_banners',
  'order_notes',
  'order_returns',
  'orders',
  'parent_products',
  'parent_product_size_stock',
  'products',
  'size_charts',
] as const;

export const PRODUCT_CSV_COLUMNS = [
  'id', 'name', 'description', 'category', 'subcategory', 'price', 'original_price',
  'image_url', 'rating', 'parent_product_id', 'size_chart_id', 'is_active', 'is_featured',
  'variants', 'gallery', 'highlights',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function localDateStamp(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function buildExportFile(
  tables: Record<string, unknown[]>,
  exportedAt: Date,
): { filename: string; json: string } {
  const counts: Record<string, number> = {};
  for (const [name, rows] of Object.entries(tables)) counts[name] = rows.length;
  const filename = `twoa-export-${localDateStamp(exportedAt)}-${pad(exportedAt.getHours())}${pad(exportedAt.getMinutes())}.json`;
  const json = JSON.stringify(
    { exportedAt: exportedAt.toISOString(), project: 'twoa-brand', tables, counts },
    null,
    2,
  );
  return { filename, json };
}

function csvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const lines = [columns.map(csvField).join(',')];
  for (const row of rows) lines.push(columns.map((c) => csvField(row[c])).join(','));
  return lines.join('\r\n');
}
