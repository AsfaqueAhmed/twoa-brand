import { supabase } from '@/shared/infrastructure/supabase/client';
import { parseGalleryRow, type GalleryArtwork } from '../domain/gallery';

// Only active rows: an admin browsing the studio must not see hidden artwork either.
export async function fetchActiveGallery(): Promise<GalleryArtwork[]> {
  const { data, error } = await supabase
    .from('gallery_artworks')
    .select('id, title, category, image_path, aspect')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return (data ?? []).map((row) => parseGalleryRow(row, base)).filter((a): a is GalleryArtwork => a !== null);
}
