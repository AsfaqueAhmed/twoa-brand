import { supabase } from '@/shared/infrastructure/supabase/client';
import { uploadProductImage } from '@/features/admin/inventory/infrastructure/productImageUpload';
import { toBanner } from '@/features/catalog/infrastructure/homeBannersRepository';
import type { HomeBanner } from '@/features/catalog/domain/banner';

export type BannerFormPayload = Omit<HomeBanner, 'id' | 'position' | 'createdAt'>;

function toRow(payload: Partial<BannerFormPayload>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (payload.isActive !== undefined) row.is_active = payload.isActive;
  if (payload.desktopImageUrl !== undefined) row.desktop_image_url = payload.desktopImageUrl;
  if ('mobileImageUrl' in payload) row.mobile_image_url = payload.mobileImageUrl ?? null;
  if (payload.eyebrow !== undefined) row.eyebrow = payload.eyebrow;
  if (payload.headline !== undefined) row.headline = payload.headline;
  if (payload.subtext !== undefined) row.subtext = payload.subtext;
  if (payload.ctaLabel !== undefined) row.cta_label = payload.ctaLabel;
  if (payload.ctaHref !== undefined) row.cta_href = payload.ctaHref;
  if (payload.desktopAspect !== undefined) row.desktop_aspect = payload.desktopAspect;
  if (payload.mobileAspect !== undefined) row.mobile_aspect = payload.mobileAspect;
  return row;
}

export async function listAllBanners(): Promise<HomeBanner[]> {
  const { data, error } = await supabase.from('home_banners').select('*').order('position', { ascending: true });
  if (error) throw error;
  return (data || []).map(toBanner);
}

export async function createBanner(id: string, payload: BannerFormPayload, position: number): Promise<void> {
  const { error } = await supabase.from('home_banners').insert({ id, position, ...toRow(payload) });
  if (error) throw error;
}

export async function updateBanner(id: string, payload: Partial<BannerFormPayload>): Promise<void> {
  const { error } = await supabase.from('home_banners').update(toRow(payload)).eq('id', id);
  if (error) throw error;
}

export async function saveBannerOrder(banners: HomeBanner[]): Promise<void> {
  const results = await Promise.all(
    banners.map((b) => supabase.from('home_banners').update({ position: b.position }).eq('id', b.id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

// The stored object's path is derived from the public URL; failures are
// swallowed because an orphaned file is harmless and the row is already gone.
async function removeStoredImage(url: string | undefined): Promise<void> {
  const marker = '/images/';
  const index = url ? url.indexOf(marker) : -1;
  if (!url || index === -1) return;
  const path = url.slice(index + marker.length).split('?')[0];
  await supabase.storage.from('images').remove([path]);
}

export async function deleteBanner(banner: HomeBanner): Promise<void> {
  const { error } = await supabase.from('home_banners').delete().eq('id', banner.id);
  if (error) throw error;
  await Promise.allSettled([removeStoredImage(banner.desktopImageUrl), removeStoredImage(banner.mobileImageUrl)]);
}

// Best-effort removal of a previously stored banner image.
export async function removeBannerImage(url?: string): Promise<void> {
  try {
    await removeStoredImage(url);
  } catch {
    // orphaned files are harmless
  }
}

// Each upload gets a unique path so replacing an image never overwrites the
// file a live banner still points to.
export async function uploadBannerImage(id: string, kind: 'desktop' | 'mobile', dataUrl: string): Promise<string> {
  return uploadProductImage(`banners/${id}-${kind}-${Date.now()}`, dataUrl, { thumbnail: false });
}
