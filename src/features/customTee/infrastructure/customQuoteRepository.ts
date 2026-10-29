import { supabase } from '@/shared/infrastructure/supabase/client';
import type { StudioDesign } from '../domain/design';
import type { QuoteContact } from '../domain/quote';

export type QuoteFiles = {
  previews: { viewId: string; label: string; path: string }[];
  artwork: { name: string; path: string }[];
};

export async function uploadQuoteFile(bucket: 'custom-previews' | 'custom-artwork', path: string, blob: Blob): Promise<void> {
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: blob.type || 'image/png', upsert: false });
  if (error) throw new Error(error.message);
}

export async function submitQuote(input: {
  id: string;
  contact: QuoteContact;
  parentProductId: string;
  teeSize: string;
  colorName?: string;
  design: StudioDesign;
  files: QuoteFiles;
  website: string;
}): Promise<void> {
  const { error } = await supabase.rpc('submit_custom_quote', {
    p_id: input.id,
    p_name: input.contact.name,
    p_phone: input.contact.phone,
    p_whatsapp: input.contact.whatsapp,
    p_parent_product_id: input.parentProductId,
    p_tee_size: input.teeSize,
    p_color_name: input.colorName ?? null,
    p_design: input.design,
    p_files: input.files,
    p_website: input.website,
  });
  if (error) throw new Error(error.message);
}
