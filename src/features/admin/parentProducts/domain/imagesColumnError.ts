// True when PostgREST reports the parent_products.images column is missing (migration not applied yet).
export function isMissingImagesColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; message?: unknown };
  return e.code === 'PGRST204' && typeof e.message === 'string' && e.message.includes('images');
}
