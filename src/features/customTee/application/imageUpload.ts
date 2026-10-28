// Reads an image file, downscales it so its longest edge is at most `maxEdge`, and returns a data URL.
// PNG/WebP are re-encoded as PNG (keeps transparency); JPEG stays JPEG.
export async function fileToDataUrl(file: File, maxEdge = 1600): Promise<{ src: string; aspect: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read that image.'));
      el.src = url;
    });
    const ratio = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * ratio));
    const height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process that image.');
    ctx.drawImage(img, 0, 0, width, height);
    const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    return { src: canvas.toDataURL(type, 0.9), aspect: width / height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
