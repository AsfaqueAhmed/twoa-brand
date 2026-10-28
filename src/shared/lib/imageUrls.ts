export const FULL_SUFFIX = '.full.webp';
export const THUMB_SUFFIX = '.thumb.webp';

function splitQuery(url: string): [string, string] {
  const i = url.search(/[?#]/);
  return i === -1 ? [url, ''] : [url.slice(0, i), url.slice(i)];
}

export function isThumbnailable(url: string | null | undefined): boolean {
  if (!url || url.startsWith('data:')) return false;
  return splitQuery(url)[0].endsWith(FULL_SUFFIX);
}

// Maps an uploaded `.full.webp` URL to its `.thumb.webp` sibling. Anything else
// (legacy jpg/png, external or data URLs, empty) is returned unchanged.
export function thumbnailUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (!isThumbnailable(url)) return url;
  const [path, rest] = splitQuery(url);
  return path.slice(0, -FULL_SUFFIX.length) + THUMB_SUFFIX + rest;
}
