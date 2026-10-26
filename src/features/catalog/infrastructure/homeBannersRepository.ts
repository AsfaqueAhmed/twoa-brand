import { supabase } from '@/shared/infrastructure/supabase/client';
import { DEFAULT_DESKTOP_ASPECT, DEFAULT_MOBILE_ASPECT, isValidDesktopAspect, isValidMobileAspect, type HomeBanner } from '../domain/banner';

export function toBanner(row: Record<string, any>): HomeBanner {
  return {
    id: row.id,
    position: Number(row.position) || 0,
    isActive: !!row.is_active,
    desktopImageUrl: row.desktop_image_url,
    mobileImageUrl: row.mobile_image_url ?? undefined,
    eyebrow: row.eyebrow ?? '',
    headline: row.headline ?? '',
    subtext: row.subtext ?? '',
    ctaLabel: row.cta_label ?? '',
    ctaHref: row.cta_href ?? '',
    desktopAspect: isValidDesktopAspect(Number(row.desktop_aspect))
      ? Number(row.desktop_aspect)
      : DEFAULT_DESKTOP_ASPECT,
    mobileAspect: isValidMobileAspect(Number(row.mobile_aspect))
      ? Number(row.mobile_aspect)
      : DEFAULT_MOBILE_ASPECT,
    createdAt: row.created_at ?? '',
  };
}

export async function fetchActiveBanners(): Promise<HomeBanner[]> {
  const { data, error } = await supabase
    .from('home_banners')
    .select('*')
    .eq('is_active', true)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data || []).map(toBanner);
}
