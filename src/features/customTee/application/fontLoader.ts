import { GOOGLE_FONTS_URLS } from '../domain/fonts';

// Injects the Google Fonts stylesheets once; text layers render in these families on both web and mobile studios.
export function ensureFontsLoaded() {
  if (typeof window === 'undefined') return;
  GOOGLE_FONTS_URLS.forEach((href, i) => {
    const id = `custom-tee-fonts-${i}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  });
}
