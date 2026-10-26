export interface HomeBanner {
  id: string;
  position: number;
  isActive: boolean;
  desktopImageUrl: string;
  mobileImageUrl?: string;
  eyebrow: string;
  headline: string;
  subtext: string;
  ctaLabel: string;
  ctaHref: string;
  createdAt: string;
}

// CTA links come from admin input, so only same-site paths and https URLs
// are allowed (blocks javascript:, data:, protocol-relative and plain http).
export function isSafeCtaHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  // Browsers strip tabs/newlines and treat "\" like "/", so "/\evil.com" and
  // "/<tab>/evil.com" resolve to "//evil.com". Reject those characters outright.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return false;
  if (value.startsWith('/')) return value[1] !== '/';
  return value.startsWith('https://');
}

export function renumberBanners(banners: HomeBanner[]): HomeBanner[] {
  return banners.map((banner, index) => ({ ...banner, position: index }));
}

export function reorderBanners(banners: HomeBanner[], fromIndex: number, toIndex: number): HomeBanner[] {
  const next = [...banners];
  if (fromIndex >= 0 && fromIndex < next.length) {
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
  }
  return renumberBanners(next);
}

export function nextBannerPosition(banners: HomeBanner[]): number {
  return banners.length === 0 ? 0 : Math.max(...banners.map((b) => b.position)) + 1;
}
