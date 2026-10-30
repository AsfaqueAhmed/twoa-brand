import { supabase } from '@/shared/infrastructure/supabase/client';
import { GALLERY_BUCKET } from '@/features/customTee/domain/gallery';
import { clampGalleryAspect, galleryObjectPath, toAdminGalleryItem, type AdminGalleryItem } from '../domain/galleryAdmin';

const TABLE = 'gallery_artworks';
const baseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export type GalleryItemPatch = Partial<Pick<AdminGalleryItem, 'title' | 'category' | 'sortOrder' | 'active'>>;

// RLS lets admins read hidden rows too.
export async function listGalleryItems(): Promise<AdminGalleryItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => toAdminGalleryItem(row, baseUrl()));
}

// Uploads the file under art/<uuid>.<ext>, then inserts the row. If the insert fails the object is removed again.
export async function createGalleryItem(input: {
  file: File;
  title: string;
  category: string;
  aspect: number;
  sortOrder: number;
}): Promise<void> {
  const path = galleryObjectPath(crypto.randomUUID(), input.file.type);
  const { error: upErr } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(path, input.file, { contentType: input.file.type, upsert: false, cacheControl: '31536000' });
  if (upErr) throw new Error(upErr.message);
  const { error } = await supabase.from(TABLE).insert({
    title: input.title,
    category: input.category,
    image_path: path,
    aspect: clampGalleryAspect(input.aspect),
    sort_order: input.sortOrder,
  });
  if (error) {
    await supabase.storage.from(GALLERY_BUCKET).remove([path]).catch(() => undefined);
    throw new Error(error.message);
  }
}

export async function updateGalleryItem(id: string, patch: GalleryItemPatch): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  if (patch.active !== undefined) row.active = patch.active;
  const { error } = await supabase.from(TABLE).update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

// Deletes the row, then its stored image. A leftover file is harmless, so storage errors are ignored.
export async function deleteGalleryItem(item: AdminGalleryItem): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', item.id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(GALLERY_BUCKET).remove([item.imagePath]).catch(() => undefined);
}
