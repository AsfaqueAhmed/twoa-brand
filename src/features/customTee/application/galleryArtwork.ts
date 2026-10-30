import type { GalleryArtwork } from '../domain/gallery';
import { fileToDataUrl } from './imageUpload';

export type GalleryAsset = { name: string; src: string; aspect: number };

const LOAD_ERROR = 'Could not load that artwork. Please try again.';

// Turns a gallery artwork into the same kind of asset an upload produces (downscaled data URL, real pixel aspect,
// original File registered), so saved designs, previews and the quote ZIP treat it like any uploaded image.
export async function loadGalleryArtworkAsAsset(item: GalleryArtwork): Promise<GalleryAsset> {
  let blob: Blob;
  try {
    const res = await fetch(item.imageUrl, { mode: 'cors' });
    if (!res.ok) throw new Error(LOAD_ERROR);
    blob = await res.blob();
  } catch {
    throw new Error(LOAD_ERROR);
  }
  const type = blob.type || 'image/png';
  const ext = type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png';
  const file = new File([blob], `${item.title}.${ext}`, { type });
  try {
    const { src, aspect } = await fileToDataUrl(file);
    return { name: item.title, src, aspect };
  } catch {
    throw new Error(LOAD_ERROR);
  }
}
