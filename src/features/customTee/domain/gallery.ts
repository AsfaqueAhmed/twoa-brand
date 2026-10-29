// Free Gallery artwork shown in the studios. Rows come from the `gallery_artworks` table; images from the public
// `gallery` storage bucket.

export const GALLERY_BUCKET = 'gallery';
export const ALL_CATEGORY = 'All';
export const DEFAULT_GALLERY_CATEGORY = 'General';

export type GalleryArtwork = {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  aspect: number;
};

// 'All' first, then each category once, in order of first appearance (the list is already sorted for display).
export function galleryCategories(items: readonly GalleryArtwork[]): string[] {
  const seen = new Set<string>();
  const out = [ALL_CATEGORY];
  for (const item of items) {
    if (seen.has(item.category)) continue;
    seen.add(item.category);
    out.push(item.category);
  }
  return out;
}

export function filterGallery(items: readonly GalleryArtwork[], category: string, query: string): GalleryArtwork[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (category !== ALL_CATEGORY && item.category !== category) return false;
    if (!q) return true;
    return item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });
}

export function galleryImageUrl(supabaseUrl: string, path: string): string {
  const base = supabaseUrl.replace(/\/+$/, '');
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/public/${GALLERY_BUCKET}/${encoded}`;
}

export function parseGalleryRow(row: unknown, supabaseUrl: string): GalleryArtwork | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  const title = typeof r.title === 'string' ? r.title.trim() : '';
  const path = typeof r.image_path === 'string' ? r.image_path : '';
  if (!id || !title || !path) return null;
  const category = typeof r.category === 'string' && r.category.trim() ? r.category.trim() : DEFAULT_GALLERY_CATEGORY;
  const aspect = Number(r.aspect);
  return {
    id,
    title,
    category,
    imageUrl: galleryImageUrl(supabaseUrl, path),
    aspect: Number.isFinite(aspect) && aspect > 0 ? aspect : 1,
  };
}
