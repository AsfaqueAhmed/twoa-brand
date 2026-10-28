export const GALLERY_CATEGORIES = ['All', 'Nature', 'Anime', 'Typography', 'Vintage'] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export type GalleryItem = {
  id: string;
  title: string;
  category: Exclude<GalleryCategory, 'All'>;
  src: string;
  aspect: number;
};

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'art-stay-wild',
    title: 'Stay Wild Mountain',
    category: 'Nature',
    aspect: 1,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" rx="32" fill="#0F172A"/>
        <circle cx="200" cy="180" r="110" fill="#F97316" opacity="0.25"/>
        <circle cx="200" cy="180" r="85" fill="#F97316" opacity="0.4"/>
        <path d="M70 280 L160 160 L210 230 L270 140 L340 280 Z" fill="#E2E8F0"/>
        <path d="M160 160 L140 200 L180 200 Z" fill="#FFFFFF"/>
        <path d="M270 140 L245 185 L290 185 Z" fill="#FFFFFF"/>
        <path d="M60 280 Q200 295 340 280 L340 310 Q200 325 60 310 Z" fill="#0284C7"/>
        <text x="200" y="350" font-family="'Impact', sans-serif" font-size="34" font-weight="900" fill="#F8FAFC" text-anchor="middle" letter-spacing="4">STAY WILD</text>
      </svg>
    `),
  },
  {
    id: 'art-great-wave',
    title: 'The Great Wave',
    category: 'Nature',
    aspect: 1,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" rx="32" fill="#FAF5EF"/>
        <circle cx="200" cy="180" r="90" fill="#E11D48" opacity="0.8"/>
        <path d="M80 300 Q150 160 260 200 Q200 240 180 300 Z" fill="#1E3A8A"/>
        <path d="M140 300 Q200 130 310 170 Q270 210 240 300 Z" fill="#0284C7"/>
        <path d="M200 300 Q240 190 320 220 L330 300 Z" fill="#93C5FD"/>
        <text x="200" y="350" font-family="'Courier New', monospace" font-size="20" font-weight="bold" fill="#0F172A" text-anchor="middle" letter-spacing="6">OFFSHORE</text>
      </svg>
    `),
  },
  {
    id: 'art-sunset-ridge',
    title: 'Sunset Ridge',
    category: 'Nature',
    aspect: 1,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" rx="32" fill="#18181B"/>
        <circle cx="200" cy="190" r="100" fill="#FBBF24"/>
        <path d="M60 270 Q200 190 340 270 L340 320 L60 320 Z" fill="#EA580C"/>
        <path d="M80 290 Q200 230 320 290 L320 330 L80 330 Z" fill="#991B1B"/>
        <path d="M100 310 Q200 270 300 310 L300 340 L100 340 Z" fill="#450A0A"/>
        <text x="200" y="365" font-family="'Georgia', serif" font-size="18" font-style="italic" fill="#FEF08A" text-anchor="middle" letter-spacing="3">Golden Horizon</text>
      </svg>
    `),
  },
  {
    id: 'art-pine-forest',
    title: 'Pine Wilderness',
    category: 'Nature',
    aspect: 1,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" rx="32" fill="#F4F4F5"/>
        <polygon points="200,80 150,170 170,170 130,240 160,240 120,310 280,310 240,240 270,240 230,170 250,170" fill="#14532D"/>
        <polygon points="120,180 80,245 100,245 70,310 170,310 140,245 160,245" fill="#166534" opacity="0.75"/>
        <polygon points="280,180 240,245 260,245 230,310 330,310 300,245 320,245" fill="#166534" opacity="0.75"/>
        <text x="200" y="355" font-family="'Arial', sans-serif" font-size="16" font-weight="bold" fill="#052E16" text-anchor="middle" letter-spacing="4">EXPLORE NATURE</text>
      </svg>
    `),
  },
  {
    id: 'art-tokyo-cyber',
    title: 'Neo Tokyo Anime',
    category: 'Anime',
    aspect: 1,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" rx="32" fill="#09090B"/>
        <circle cx="200" cy="180" r="105" fill="#EC4899" opacity="0.85"/>
        <rect x="110" y="140" width="180" height="18" rx="9" fill="#22D3EE"/>
        <text x="200" y="240" font-family="'Arial Black', sans-serif" font-size="52" font-weight="900" fill="#FFFFFF" text-anchor="middle">東京</text>
        <text x="200" y="280" font-family="'Courier New', monospace" font-size="16" font-weight="bold" fill="#F472B6" text-anchor="middle" letter-spacing="6">NEO-TOKYO // 2099</text>
      </svg>
    `),
  },
  {
    id: 'art-anime-moon',
    title: 'Night Blossom',
    category: 'Anime',
    aspect: 1,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" rx="32" fill="#1E1B4B"/>
        <circle cx="200" cy="180" r="95" fill="#FDE047"/>
        <circle cx="230" cy="160" r="85" fill="#1E1B4B"/>
        <circle cx="160" cy="220" r="8" fill="#F472B6"/>
        <circle cx="230" cy="240" r="10" fill="#F472B6"/>
        <circle cx="260" cy="190" r="7" fill="#F472B6"/>
        <text x="200" y="340" font-family="'Georgia', serif" font-size="22" fill="#E0E7FF" text-anchor="middle" letter-spacing="4">MOONLIGHT</text>
      </svg>
    `),
  },
  {
    id: 'art-retro-bengali',
    title: 'Bengali Typography',
    category: 'Typography',
    aspect: 1,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" rx="32" fill="#FEF3C7"/>
        <circle cx="200" cy="170" r="90" fill="#F59E0B" opacity="0.3"/>
        <text x="200" y="190" font-family="'Noto Sans Bengali', 'Arial', sans-serif" font-size="44" font-weight="bold" fill="#78350F" text-anchor="middle">বিকেলের আলো</text>
        <line x1="100" y1="220" x2="300" y2="220" stroke="#B45309" stroke-width="3" stroke-dasharray="6,6"/>
        <text x="200" y="260" font-family="'Arial', sans-serif" font-size="14" font-weight="bold" fill="#92400E" text-anchor="middle" letter-spacing="5">AFTERNOON GLOW</text>
      </svg>
    `),
  },
  {
    id: 'art-good-vibes',
    title: 'Good Vibes Only',
    category: 'Typography',
    aspect: 1,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" rx="32" fill="#042F2E"/>
        <text x="200" y="170" font-family="'Impact', sans-serif" font-size="48" fill="#2DD4BF" text-anchor="middle" letter-spacing="2">GOOD</text>
        <text x="200" y="230" font-family="'Impact', sans-serif" font-size="64" fill="#F0FDFA" text-anchor="middle" letter-spacing="3">VIBES</text>
        <text x="200" y="280" font-family="'Impact', sans-serif" font-size="36" fill="#14B8A6" text-anchor="middle" letter-spacing="8">ONLY</text>
      </svg>
    `),
  },
  {
    id: 'art-vintage-compass',
    title: 'Explorer Compass',
    category: 'Vintage',
    aspect: 1,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" rx="32" fill="#292524"/>
        <circle cx="200" cy="180" r="90" fill="none" stroke="#D6D3D1" stroke-width="4" stroke-dasharray="8,4"/>
        <polygon points="200,95 215,180 200,165 185,180" fill="#EF4444"/>
        <polygon points="200,265 215,180 200,195 185,180" fill="#E7E5E4"/>
        <polygon points="115,180 200,165 185,180 200,195" fill="#A8A29E"/>
        <polygon points="285,180 200,165 215,180 200,195" fill="#A8A29E"/>
        <text x="200" y="340" font-family="'Times New Roman', serif" font-size="20" font-weight="bold" fill="#FAFAF9" text-anchor="middle" letter-spacing="6">NORTH BOUND</text>
      </svg>
    `),
  },
  {
    id: 'art-retro-skull',
    title: 'Vintage Motor Club',
    category: 'Vintage',
    aspect: 1,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" rx="32" fill="#1C1917"/>
        <circle cx="200" cy="180" r="100" fill="#78350F" opacity="0.3"/>
        <path d="M150 170 C150 120, 250 120, 250 170 C250 210, 230 220, 220 250 L180 250 C170 220, 150 210, 150 170 Z" fill="#E7E5E4"/>
        <circle cx="175" cy="175" r="16" fill="#1C1917"/>
        <circle cx="225" cy="175" r="16" fill="#1C1917"/>
        <polygon points="200,195 190,215 210,215" fill="#1C1917"/>
        <text x="200" y="325" font-family="'Impact', sans-serif" font-size="28" fill="#F59E0B" text-anchor="middle" letter-spacing="4">SPEED FREAKS</text>
        <text x="200" y="355" font-family="'Arial', sans-serif" font-size="12" fill="#A8A29E" text-anchor="middle" letter-spacing="6">EST. 1974</text>
      </svg>
    `),
  },
];

export function filterGalleryByCategory(category: GalleryCategory, query = ''): GalleryItem[] {
  return GALLERY_ITEMS.filter((item) => {
    const matchesCategory = category === 'All' || item.category === category;
    const matchesQuery = !query || item.title.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });
}
