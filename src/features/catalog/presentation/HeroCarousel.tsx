'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomeBanner } from '../domain/banner';
import { isSafeCtaHref } from '../domain/banner';

const AUTO_ADVANCE_MS = 5000;
const SWIPE_THRESHOLD_PX = 40;

// previewMode forces the desktop or mobile layout regardless of viewport width
// (used by the admin live preview); without it the layout follows the viewport.
export default function HeroCarousel({
  banners,
  previewMode,
}: {
  banners: HomeBanner[];
  previewMode?: 'desktop' | 'mobile';
}) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = banners.length;
  const safeIndex = index < count ? index : 0;
  const paused = hovered || focused || touching;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [count, paused, reducedMotion]);

  if (count === 0) return null;

  const go = (next: number) => setIndex(((next % count) + count) % count);

  const isMobile = previewMode === 'mobile';
  const isDesktop = previewMode === 'desktop';
  const eyebrowSize = isMobile ? 'text-xs' : isDesktop ? 'text-sm' : 'text-xs sm:text-sm';
  const headlineSize = isMobile ? 'text-4xl' : isDesktop ? 'text-6xl' : 'text-4xl sm:text-6xl';
  const subtextSize = isMobile ? 'text-sm' : isDesktop ? 'text-base' : 'text-sm sm:text-base';
  const textAlign = isMobile ? 'items-end' : isDesktop ? 'items-center' : 'items-end sm:items-center';
  const textPadding = isMobile ? 'px-4 pb-10' : isDesktop ? 'px-6 lg:px-8 pb-0' : 'px-4 sm:px-6 lg:px-8 pb-10 sm:pb-0';

  return (
    <section
      className="relative w-full overflow-hidden bg-[#F0EEE9]"
      id="hero-carousel"
      aria-roledescription="carousel"
      aria-label="Featured banners"
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') setHovered(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') setHovered(false);
      }}
      onTouchCancel={() => {
        touchStartX.current = null;
        setTouching(false);
      }}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onTouchStart={(e) => {
        setTouching(true);
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        setTouching(false);
        if (start === null || count < 2) return;
        const delta = e.changedTouches[0].clientX - start;
        if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) go(safeIndex + (delta < 0 ? 1 : -1));
      }}
    >
      <div
        className={
          previewMode
            ? 'relative w-full'
            : 'relative aspect-[var(--hero-aspect-mobile)] sm:aspect-[var(--hero-aspect)] w-full'
        }
        style={
          previewMode
            ? { aspectRatio: String(isMobile ? banners[0].mobileAspect : banners[0].desktopAspect) }
            : ({
                '--hero-aspect': String(banners[0].desktopAspect),
                '--hero-aspect-mobile': String(banners[0].mobileAspect),
              } as React.CSSProperties)
        }
      >
        {banners.map((banner, i) => {
          const active = i === safeIndex;
          const linked = isSafeCtaHref(banner.ctaHref);
          const showCta = linked && !!banner.ctaLabel.trim();
          return (
            <div
              key={banner.id}
              aria-hidden={!active}
              role="group"
              aria-roledescription="slide"
              className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
                active ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
              }`}
            >
              <picture>
                {!previewMode && banner.mobileImageUrl && (
                  <source media="(max-width: 639px)" srcSet={banner.mobileImageUrl} />
                )}
                <img
                  src={isMobile ? banner.mobileImageUrl || banner.desktopImageUrl : banner.desktopImageUrl}
                  alt={banner.headline ? '' : 'Banner'}
                  className="h-full w-full object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  referrerPolicy="no-referrer"
                />
              </picture>

              {(banner.eyebrow || banner.headline || banner.subtext || showCta) && (
                <div className={`pointer-events-none absolute inset-0 flex ${textAlign}`}>
                  <div className={`mx-auto w-full max-w-7xl ${textPadding}`}>
                    <div className="max-w-xl space-y-3">
                      {banner.eyebrow && (
                        <p className={`${eyebrowSize} font-semibold uppercase tracking-[0.2em] text-black`}>
                          {banner.eyebrow}
                        </p>
                      )}
                      {banner.headline && (
                        <h2 className={`${headlineSize} font-black uppercase leading-[0.95] tracking-tight text-black`}>
                          {banner.headline}
                        </h2>
                      )}
                      {banner.subtext && (
                        <p className={`${subtextSize} text-black/80 leading-relaxed`}>{banner.subtext}</p>
                      )}
                      {showCta && (
                        <span className="inline-flex h-11 items-center bg-black px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white">
                          {banner.ctaLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {linked && (
                <a
                  href={banner.ctaHref}
                  className="absolute inset-0 z-20"
                  aria-label={banner.headline || banner.ctaLabel || 'Banner'}
                  tabIndex={active ? 0 : -1}
                />
              )}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Go to banner ${i + 1}`}
              aria-current={i === safeIndex ? 'true' : undefined}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all ${i === safeIndex ? 'w-6 bg-black' : 'w-2 bg-black/30'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
