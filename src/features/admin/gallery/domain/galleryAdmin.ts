import { DEFAULT_GALLERY_CATEGORY, galleryImageUrl } from '@/features/customTee/domain/gallery';

// Source files up to 25 MB are accepted; they are shrunk to under 500 KB in the browser before upload.
export const GALLERY_MAX_BYTES = 25 * 1024 * 1024;
export const GALLERY_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const GALLERY_TITLE_MAX = 100;
export const GALLERY_CATEGORY_MAX = 40;

export type AdminGalleryItem = {
  id: string;
  title: string;
  category: string;
  imagePath: string;
  imageUrl: string;
  aspect: number;
  sortOrder: number;
  active: boolean;
  createdAt: string;
};

export function validateGalleryFile(file: { type: string; size: number }): string | null {
  if (!(GALLERY_MIME_TYPES as readonly string[]).includes(file.type)) return 'Use a PNG, JPG or WebP image.';
  if (file.size > GALLERY_MAX_BYTES) return 'Images must be 25 MB or smaller.';
  return null;
}

export function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]*$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (base || 'Untitled').slice(0, GALLERY_TITLE_MAX);
}

export function extForGalleryMime(mime: string): string {
  return mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
}

export function galleryObjectPath(uuid: string, mime: string): string {
  return `art/${uuid}.${extForGalleryMime(mime)}`;
}

export function normalizeCategory(input: string): string {
  return (input.trim() || DEFAULT_GALLERY_CATEGORY).slice(0, GALLERY_CATEGORY_MAX);
}

export function distinctCategories(items: readonly AdminGalleryItem[]): string[] {
  return [...new Set(items.map((i) => i.category))].sort((a, b) => a.localeCompare(b));
}

export function nextSortOrder(items: readonly AdminGalleryItem[]): number {
  return items.length === 0 ? 0 : Math.max(...items.map((i) => i.sortOrder)) + 1;
}

export function toAdminGalleryItem(row: Record<string, any>, supabaseUrl: string): AdminGalleryItem {
  const aspect = Number(row.aspect);
  return {
    id: row.id,
    title: row.title ?? '',
    category: row.category ?? DEFAULT_GALLERY_CATEGORY,
    imagePath: row.image_path,
    imageUrl: galleryImageUrl(supabaseUrl, row.image_path ?? ''),
    aspect: Number.isFinite(aspect) && aspect > 0 ? aspect : 1,
    sortOrder: Number(row.sort_order) || 0,
    active: row.active !== false,
    createdAt: row.created_at ?? '',
  };
}

// The table only accepts 0.05 < aspect < 20.
export function clampGalleryAspect(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return 1;
  return Math.min(19.9, Math.max(0.06, aspect));
}
