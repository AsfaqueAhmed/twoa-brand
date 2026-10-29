import { compressImage } from '@/shared/lib/compressImage';
import { DESIGN_IMAGE_MAX_BYTES, DESIGN_IMAGE_MAX_EDGE, withExtension } from '@/shared/lib/imageCompression';
import { registerOriginal } from './artworkOriginals';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(blob);
  });
}

// Reads an image file, shrinks it to at most 1 MB / 2000 px (transparency is kept), and returns a data URL.
// The shrunken file is what a quote uploads as the artwork original.
export async function fileToDataUrl(file: File, maxEdge = DESIGN_IMAGE_MAX_EDGE): Promise<{ src: string; aspect: number }> {
  const { blob, width, height, mime } = await compressImage(file, { maxBytes: DESIGN_IMAGE_MAX_BYTES, maxEdge });
  const src = await blobToDataUrl(blob);
  registerOriginal(src, blob === file ? file : new File([blob], withExtension(file.name, mime), { type: mime }));
  return { src, aspect: width / height };
}
