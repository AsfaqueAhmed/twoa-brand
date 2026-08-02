import { supabase } from '@/shared/infrastructure/supabase/client';

const BUCKET = 'images';

function extensionForDataUrl(dataUrl: string): string {
  const match = /^data:image\/(\w+);base64,/.exec(dataUrl);
  const type = match?.[1] ?? 'jpeg';
  return type === 'jpeg' ? 'jpg' : type;
}

// Uploads a cropped/compressed data URL (from ImageCropperModal) to Supabase
// Storage and returns its public URL. storagePath is the object path without
// extension — the extension is derived from the data URL's mime type.
export async function uploadProductImage(storagePath: string, dataUrl: string): Promise<string> {
  const base64 = dataUrl.split(',')[1] ?? '';
  const ext = extensionForDataUrl(dataUrl);
  const fullPath = `${storagePath}.${ext}`;
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fullPath, bytes, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(fullPath).data.publicUrl;
}
