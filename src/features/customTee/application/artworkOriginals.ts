// Remembers the original uploaded File for each downscaled data URL while the studio tab is open,
// so a quote can upload the full-quality artwork when it is still available.
const originals = new Map<string, File>();

export function registerOriginal(dataUrl: string, file: File): void {
  originals.set(dataUrl, file);
}

export function getOriginal(dataUrl: string): File | undefined {
  return originals.get(dataUrl);
}
