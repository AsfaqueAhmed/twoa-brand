export const MAX_GALLERY_IMAGES = 8;

// Main image first, then the extra gallery photos; empty entries and
// duplicates are dropped so a repeated URL never shows two identical thumbnails.
export function getGalleryImages(mainImage: string, gallery: string[] | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of [mainImage, ...(gallery ?? []).slice(0, MAX_GALLERY_IMAGES)]) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push(url);
  }
  return result;
}
