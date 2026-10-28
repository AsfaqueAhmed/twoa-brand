import { GOOGLE_FONTS_URL } from '../domain/fonts';

// Injects the Google Fonts stylesheet once; text layers render in these families on both web and mobile studios.
export function ensureFontsLoaded() {
  if (typeof window === 'undefined') return;
  const id = 'custom-tee-fonts';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = GOOGLE_FONTS_URL;
  document.head.appendChild(link);
}
