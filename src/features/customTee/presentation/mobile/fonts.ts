export type MobileFont = {
  id: string;
  family: string;
  label: string;
  script: 'bengali' | 'latin';
  previewText: string;
  sampleLetter: string;
};

export const MOBILE_FONTS: MobileFont[] = [
  {
    id: 'noto-sans-bengali',
    family: "'Noto Sans Bengali', sans-serif",
    label: 'Noto Sans Bengali',
    script: 'bengali',
    previewText: 'বিকেলের আলো',
    sampleLetter: 'Ag',
  },
  {
    id: 'hind-siliguri',
    family: "'Hind Siliguri', sans-serif",
    label: 'Hind Siliguri',
    script: 'bengali',
    previewText: 'বিকেলের আলো',
    sampleLetter: 'Ag',
  },
  {
    id: 'solaiman-lipi',
    family: "'SolaimanLipi', 'Noto Sans Bengali', sans-serif",
    label: 'SolaimanLipi',
    script: 'bengali',
    previewText: 'বিকেলের আলো',
    sampleLetter: 'Ag',
  },
  {
    id: 'kalpurush',
    family: "'Kalpurush', 'Noto Sans Bengali', sans-serif",
    label: 'Kalpurush',
    script: 'bengali',
    previewText: 'বিকেলের আলো',
    sampleLetter: 'Ag',
  },
  {
    id: 'inter',
    family: "'Inter', sans-serif",
    label: 'Inter Sans',
    script: 'latin',
    previewText: 'Modern Aesthetic',
    sampleLetter: 'Ag',
  },
  {
    id: 'bebas-neue',
    family: "'Bebas Neue', Impact, sans-serif",
    label: 'Bebas Neue',
    script: 'latin',
    previewText: 'BOLD BOLD BOLD',
    sampleLetter: 'Ag',
  },
  {
    id: 'playfair',
    family: "'Playfair Display', Georgia, serif",
    label: 'Playfair Display',
    script: 'latin',
    previewText: 'Elegant Editorial',
    sampleLetter: 'Ag',
  },
];

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hind+Siliguri:wght@400;600;700&family=Inter:wght@400;600;800&family=Noto+Sans+Bengali:wght@400;600;700&family=Playfair+Display:ital,wght@0,600;1,400&display=swap';

export function ensureGoogleFontsLoaded() {
  if (typeof window === 'undefined') return;
  const id = 'custom-tee-mobile-fonts';
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = GOOGLE_FONTS_URL;
  document.head.appendChild(link);
}
