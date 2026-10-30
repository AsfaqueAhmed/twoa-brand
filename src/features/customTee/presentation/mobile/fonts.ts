import { FONT_PICKER_OPTIONS, type FontOption } from '../../domain/fonts';
import { ensureFontsLoaded } from '../../application/fontLoader';

export type MobileFont = FontOption & {
  id: string;
  previewText: string;
  sampleLetter: string;
};

const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Mobile uses the same catalog as the web studio, so a design looks identical on both.
export const MOBILE_FONTS: MobileFont[] = FONT_PICKER_OPTIONS.map((f) => ({
  ...f,
  id: slug(f.label),
  previewText: f.script === 'bengali' ? 'বিকেলের আলো' : 'Modern Aesthetic',
  sampleLetter: f.script === 'bengali' ? 'অআ' : 'Ag',
}));

export const ensureGoogleFontsLoaded = ensureFontsLoaded;
