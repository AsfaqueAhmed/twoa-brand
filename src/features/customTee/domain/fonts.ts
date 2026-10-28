export type FontCategory = 'Bengali' | 'Brush' | 'Graffiti' | 'Bold' | 'Script' | 'Handwritten' | 'Clean' | 'Elegant' | 'Fun' | 'Retro' | 'Classic';

export type FontOption = {
  label: string;
  /** CSS font-family value stored on text layers. */
  family: string;
  category: FontCategory;
  script: 'latin' | 'bengali';
  /** Google Fonts css2 `family=` spec; absent for system fonts. */
  google?: string;
};

// Bengali first, then the display styles; the system fonts come last and keep their original values so
// designs saved earlier still resolve.
export const FONT_CATALOG: readonly FontOption[] = [
  { label: 'Noto Sans Bengali', family: "'Noto Sans Bengali', sans-serif", category: 'Bengali', script: 'bengali', google: 'Noto+Sans+Bengali:wght@400;700' },
  { label: 'Hind Siliguri', family: "'Hind Siliguri', sans-serif", category: 'Bengali', script: 'bengali', google: 'Hind+Siliguri:wght@400;700' },
  { label: 'Baloo Da 2', family: "'Baloo Da 2', sans-serif", category: 'Bengali', script: 'bengali', google: 'Baloo+Da+2:wght@400;700' },
  { label: 'Anek Bangla', family: "'Anek Bangla', sans-serif", category: 'Bengali', script: 'bengali', google: 'Anek+Bangla:wght@400;700' },
  { label: 'Galada', family: "'Galada', cursive", category: 'Bengali', script: 'bengali', google: 'Galada' },
  { label: 'Atma', family: "'Atma', cursive", category: 'Bengali', script: 'bengali', google: 'Atma:wght@400;700' },
  { label: 'Alkatra', family: "'Alkatra', cursive", category: 'Bengali', script: 'bengali', google: 'Alkatra:wght@400;700' },
  { label: 'Tiro Bangla', family: "'Tiro Bangla', serif", category: 'Bengali', script: 'bengali', google: 'Tiro+Bangla:ital@0;1' },
  { label: 'Noto Serif Bengali', family: "'Noto Serif Bengali', serif", category: 'Bengali', script: 'bengali', google: 'Noto+Serif+Bengali:wght@400;700' },
  { label: 'Mina', family: "'Mina', sans-serif", category: 'Bengali', script: 'bengali', google: 'Mina:wght@400;700' },
  { label: 'Permanent Marker', family: "'Permanent Marker', cursive", category: 'Brush', script: 'latin', google: 'Permanent+Marker' },
  { label: 'Knewave', family: "'Knewave', cursive", category: 'Brush', script: 'latin', google: 'Knewave' },
  { label: 'Kaushan Script', family: "'Kaushan Script', cursive", category: 'Brush', script: 'latin', google: 'Kaushan+Script' },
  { label: 'Rock Salt', family: "'Rock Salt', cursive", category: 'Brush', script: 'latin', google: 'Rock+Salt' },
  { label: 'Nanum Brush Script', family: "'Nanum Brush Script', cursive", category: 'Brush', script: 'latin', google: 'Nanum+Brush+Script' },
  { label: 'Mansalva', family: "'Mansalva', cursive", category: 'Brush', script: 'latin', google: 'Mansalva' },
  { label: 'Marck Script', family: "'Marck Script', cursive", category: 'Brush', script: 'latin', google: 'Marck+Script' },
  { label: 'Gochi Hand', family: "'Gochi Hand', cursive", category: 'Brush', script: 'latin', google: 'Gochi+Hand' },
  { label: 'Covered By Your Grace', family: "'Covered By Your Grace', cursive", category: 'Brush', script: 'latin', google: 'Covered+By+Your+Grace' },
  { label: 'Reenie Beanie', family: "'Reenie Beanie', cursive", category: 'Brush', script: 'latin', google: 'Reenie+Beanie' },
  { label: 'Just Another Hand', family: "'Just Another Hand', cursive", category: 'Brush', script: 'latin', google: 'Just+Another+Hand' },
  { label: 'Rubik Scribble', family: "'Rubik Scribble', sans-serif", category: 'Brush', script: 'latin', google: 'Rubik+Scribble' },
  { label: 'Sedgwick Ave Display', family: "'Sedgwick Ave Display', cursive", category: 'Graffiti', script: 'latin', google: 'Sedgwick+Ave+Display' },
  { label: 'Sedgwick Ave', family: "'Sedgwick Ave', cursive", category: 'Graffiti', script: 'latin', google: 'Sedgwick+Ave' },
  { label: 'Rubik Spray Paint', family: "'Rubik Spray Paint', sans-serif", category: 'Graffiti', script: 'latin', google: 'Rubik+Spray+Paint' },
  { label: 'Rubik Wet Paint', family: "'Rubik Wet Paint', sans-serif", category: 'Graffiti', script: 'latin', google: 'Rubik+Wet+Paint' },
  { label: 'Rubik Dirt', family: "'Rubik Dirt', sans-serif", category: 'Graffiti', script: 'latin', google: 'Rubik+Dirt' },
  { label: 'Rubik Distressed', family: "'Rubik Distressed', sans-serif", category: 'Graffiti', script: 'latin', google: 'Rubik+Distressed' },
  { label: 'Rubik Burned', family: "'Rubik Burned', sans-serif", category: 'Graffiti', script: 'latin', google: 'Rubik+Burned' },
  { label: 'Rubik Glitch', family: "'Rubik Glitch', sans-serif", category: 'Graffiti', script: 'latin', google: 'Rubik+Glitch' },
  { label: 'Rubik Marker Hatch', family: "'Rubik Marker Hatch', sans-serif", category: 'Graffiti', script: 'latin', google: 'Rubik+Marker+Hatch' },
  { label: 'Barrio', family: "'Barrio', cursive", category: 'Graffiti', script: 'latin', google: 'Barrio' },
  { label: 'Londrina Solid', family: "'Londrina Solid', sans-serif", category: 'Graffiti', script: 'latin', google: 'Londrina+Solid:wght@400;900' },
  { label: 'Londrina Sketch', family: "'Londrina Sketch', sans-serif", category: 'Graffiti', script: 'latin', google: 'Londrina+Sketch' },
  { label: 'Londrina Shadow', family: "'Londrina Shadow', sans-serif", category: 'Graffiti', script: 'latin', google: 'Londrina+Shadow' },
  { label: 'Londrina Outline', family: "'Londrina Outline', sans-serif", category: 'Graffiti', script: 'latin', google: 'Londrina+Outline' },
  { label: 'Frijole', family: "'Frijole', cursive", category: 'Graffiti', script: 'latin', google: 'Frijole' },
  { label: 'Bangers', family: "'Bangers', cursive", category: 'Graffiti', script: 'latin', google: 'Bangers' },
  { label: 'UnifrakturCook', family: "'UnifrakturCook', serif", category: 'Graffiti', script: 'latin', google: 'UnifrakturCook:wght@700' },
  { label: 'UnifrakturMaguntia', family: "'UnifrakturMaguntia', serif", category: 'Graffiti', script: 'latin', google: 'UnifrakturMaguntia' },
  { label: 'Pirata One', family: "'Pirata One', serif", category: 'Graffiti', script: 'latin', google: 'Pirata+One' },
  { label: 'Metal Mania', family: "'Metal Mania', cursive", category: 'Graffiti', script: 'latin', google: 'Metal+Mania' },
  { label: 'Creepster', family: "'Creepster', cursive", category: 'Graffiti', script: 'latin', google: 'Creepster' },
  { label: 'Bebas Neue', family: "'Bebas Neue', sans-serif", category: 'Bold', script: 'latin', google: 'Bebas+Neue' },
  { label: 'Anton', family: "'Anton', sans-serif", category: 'Bold', script: 'latin', google: 'Anton' },
  { label: 'Oswald', family: "'Oswald', sans-serif", category: 'Bold', script: 'latin', google: 'Oswald:wght@400;700' },
  { label: 'Archivo Black', family: "'Archivo Black', sans-serif", category: 'Bold', script: 'latin', google: 'Archivo+Black' },
  { label: 'League Spartan', family: "'League Spartan', sans-serif", category: 'Bold', script: 'latin', google: 'League+Spartan:wght@400;800' },
  { label: 'Staatliches', family: "'Staatliches', sans-serif", category: 'Bold', script: 'latin', google: 'Staatliches' },
  { label: 'Fjalla One', family: "'Fjalla One', sans-serif", category: 'Bold', script: 'latin', google: 'Fjalla+One' },
  { label: 'Russo One', family: "'Russo One', sans-serif", category: 'Bold', script: 'latin', google: 'Russo+One' },
  { label: 'Alfa Slab One', family: "'Alfa Slab One', serif", category: 'Bold', script: 'latin', google: 'Alfa+Slab+One' },
  { label: 'Bowlby One', family: "'Bowlby One', sans-serif", category: 'Bold', script: 'latin', google: 'Bowlby+One' },
  { label: 'Black Ops One', family: "'Black Ops One', sans-serif", category: 'Bold', script: 'latin', google: 'Black+Ops+One' },
  { label: 'Pacifico', family: "'Pacifico', cursive", category: 'Script', script: 'latin', google: 'Pacifico' },
  { label: 'Lobster', family: "'Lobster', cursive", category: 'Script', script: 'latin', google: 'Lobster' },
  { label: 'Dancing Script', family: "'Dancing Script', cursive", category: 'Script', script: 'latin', google: 'Dancing+Script:wght@400;700' },
  { label: 'Great Vibes', family: "'Great Vibes', cursive", category: 'Script', script: 'latin', google: 'Great+Vibes' },
  { label: 'Satisfy', family: "'Satisfy', cursive", category: 'Script', script: 'latin', google: 'Satisfy' },
  { label: 'Sacramento', family: "'Sacramento', cursive", category: 'Script', script: 'latin', google: 'Sacramento' },
  { label: 'Yellowtail', family: "'Yellowtail', cursive", category: 'Script', script: 'latin', google: 'Yellowtail' },
  { label: 'Caveat', family: "'Caveat', cursive", category: 'Handwritten', script: 'latin', google: 'Caveat:wght@400;700' },
  { label: 'Shadows Into Light', family: "'Shadows Into Light', cursive", category: 'Handwritten', script: 'latin', google: 'Shadows+Into+Light' },
  { label: 'Amatic SC', family: "'Amatic SC', cursive", category: 'Handwritten', script: 'latin', google: 'Amatic+SC:wght@400;700' },
  { label: 'Inter', family: "'Inter', sans-serif", category: 'Clean', script: 'latin', google: 'Inter:wght@400;700' },
  { label: 'Montserrat', family: "'Montserrat', sans-serif", category: 'Clean', script: 'latin', google: 'Montserrat:wght@400;800' },
  { label: 'Poppins', family: "'Poppins', sans-serif", category: 'Clean', script: 'latin', google: 'Poppins:wght@400;700' },
  { label: 'Raleway', family: "'Raleway', sans-serif", category: 'Clean', script: 'latin', google: 'Raleway:wght@400;800' },
  { label: 'Space Grotesk', family: "'Space Grotesk', sans-serif", category: 'Clean', script: 'latin', google: 'Space+Grotesk:wght@400;700' },
  { label: 'Playfair Display', family: "'Playfair Display', serif", category: 'Elegant', script: 'latin', google: 'Playfair+Display:ital,wght@0,400;0,700;1,400;1,700' },
  { label: 'Abril Fatface', family: "'Abril Fatface', serif", category: 'Elegant', script: 'latin', google: 'Abril+Fatface' },
  { label: 'DM Serif Display', family: "'DM Serif Display', serif", category: 'Elegant', script: 'latin', google: 'DM+Serif+Display:ital@0;1' },
  { label: 'Cinzel', family: "'Cinzel', serif", category: 'Elegant', script: 'latin', google: 'Cinzel:wght@400;700' },
  { label: 'Bodoni Moda', family: "'Bodoni Moda', serif", category: 'Elegant', script: 'latin', google: 'Bodoni+Moda:wght@400;700' },
  { label: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", category: 'Elegant', script: 'latin', google: 'Cormorant+Garamond:wght@400;700' },
  { label: 'Bungee', family: "'Bungee', sans-serif", category: 'Fun', script: 'latin', google: 'Bungee' },
  { label: 'Righteous', family: "'Righteous', sans-serif", category: 'Fun', script: 'latin', google: 'Righteous' },
  { label: 'Lilita One', family: "'Lilita One', sans-serif", category: 'Fun', script: 'latin', google: 'Lilita+One' },
  { label: 'Chango', family: "'Chango', sans-serif", category: 'Fun', script: 'latin', google: 'Chango' },
  { label: 'Fredoka', family: "'Fredoka', sans-serif", category: 'Fun', script: 'latin', google: 'Fredoka:wght@400;700' },
  { label: 'Monoton', family: "'Monoton', sans-serif", category: 'Fun', script: 'latin', google: 'Monoton' },
  { label: 'Press Start 2P', family: "'Press Start 2P', monospace", category: 'Retro', script: 'latin', google: 'Press+Start+2P' },
  { label: 'Special Elite', family: "'Special Elite', monospace", category: 'Retro', script: 'latin', google: 'Special+Elite' },
  { label: 'Orbitron', family: "'Orbitron', sans-serif", category: 'Retro', script: 'latin', google: 'Orbitron:wght@400;800' },
  { label: 'Audiowide', family: "'Audiowide', sans-serif", category: 'Retro', script: 'latin', google: 'Audiowide' },
  { label: 'Fredericka the Great', family: "'Fredericka the Great', serif", category: 'Retro', script: 'latin', google: 'Fredericka+the+Great' },
  { label: 'Sans', family: 'Arial, Helvetica, sans-serif', category: 'Classic', script: 'latin' },
  { label: 'Serif', family: 'Georgia, "Times New Roman", serif', category: 'Classic', script: 'latin' },
  { label: 'Mono', family: '"Courier New", Courier, monospace', category: 'Classic', script: 'latin' },
  { label: 'Impact', family: 'Impact, "Arial Black", sans-serif', category: 'Classic', script: 'latin' },
  { label: 'Script', family: '"Brush Script MT", "Segoe Script", cursive', category: 'Classic', script: 'latin' },
] as const;

/** Default for new text: Arial, a Latin system font (Bengali text falls back through the system stack). */
export const DEFAULT_FONT_FAMILY = 'Arial, Helvetica, sans-serif';

export const FONT_CATEGORIES: readonly FontCategory[] = ['Bengali', 'Brush', 'Graffiti', 'Bold', 'Script', 'Handwritten', 'Clean', 'Elegant', 'Fun', 'Retro', 'Classic'];

export const GOOGLE_FONTS_URL = `https://fonts.googleapis.com/css2?${FONT_CATALOG.filter((f) => f.google)
  .map((f) => `family=${f.google}`)
  .join('&')}&display=swap`;
