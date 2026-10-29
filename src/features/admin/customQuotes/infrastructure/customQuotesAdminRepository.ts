import { supabase } from '@/shared/infrastructure/supabase/client';
import type { CustomQuote, QuoteLine, QuoteStatus } from '../domain/customQuote';

function toQuote(row: Record<string, any>): CustomQuote {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    whatsapp: row.whatsapp,
    parentProductId: row.parent_product_id,
    parentName: row.parent_name,
    teeSize: row.tee_size,
    colorName: row.color_name ?? undefined,
    design: row.design ?? {},
    files: row.files ?? { previews: [], artwork: [] },
    status: row.status,
    adminNote: row.admin_note ?? '',
    lines: Array.isArray(row.lines) ? row.lines : [],
    unitPrice: row.unit_price != null ? Number(row.unit_price) : undefined,
    quoteToken: row.quote_token ?? undefined,
    quoteExpiresAt: row.quote_expires_at ?? undefined,
    orderId: row.order_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listQuotes(): Promise<CustomQuote[]> {
  const { data, error } = await supabase.from('custom_quotes').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(toQuote);
}

export async function getQuote(id: string): Promise<CustomQuote | null> {
  const { data, error } = await supabase.from('custom_quotes').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toQuote(data) : null;
}

export async function updateQuote(id: string, patch: { status?: QuoteStatus; adminNote?: string }): Promise<void> {
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.adminNote !== undefined) update.admin_note = patch.adminNote;
  const { error } = await supabase.from('custom_quotes').update(update).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setQuotePricing(
  id: string,
  lines: QuoteLine[],
  unitPrice: number,
  expiresAt: Date,
  regenerate: boolean,
): Promise<string> {
  const { data, error } = await supabase.rpc('set_custom_quote_pricing', {
    p_id: id,
    p_lines: lines,
    p_unit_price: unitPrice,
    p_expires_at: expiresAt.toISOString(),
    p_regenerate: regenerate,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export function previewUrl(path: string): string {
  return supabase.storage.from('custom-previews').getPublicUrl(path).data.publicUrl;
}

export async function downloadQuoteFile(bucket: string, path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new Error(error?.message || 'Download failed');
  return data;
}

export async function validSizesForParent(parentProductId: string): Promise<string[]> {
  // The SQL RPC validates against parent_product_size_stock, so list sizes from the same table.
  const { data, error } = await supabase.from('parent_product_size_stock').select('size').eq('parent_id', parentProductId);
  if (error) throw new Error(error.message);
  return (data || []).map((r: { size: string }) => r.size);
}
