import {
  Droplets,
  Leaf,
  Package,
  Ruler,
  Shirt,
  ShieldCheck,
  Sparkles,
  Truck,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { HighlightIconKey, ProductHighlight } from '@/shared/domain/types';

export const HIGHLIGHT_ICON_COMPONENTS: Record<HighlightIconKey, LucideIcon> = {
  leaf: Leaf,
  shirt: Shirt,
  truck: Truck,
  shield: ShieldCheck,
  package: Package,
  sparkles: Sparkles,
  ruler: Ruler,
  droplets: Droplets,
  wind: Wind,
};

// Literal class names so Tailwind can see every case.
const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1 sm:grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
};

export default function ProductHighlights({ highlights }: { highlights: ProductHighlight[] }) {
  const cols = GRID_COLS[Math.min(Math.max(highlights.length, 1), 3)];
  return (
    <div className={`grid ${cols} gap-3 border-y border-[#E4E1DA] py-4`}>
      {highlights.map(({ icon, title, subtitle }, i) => {
        const Icon = HIGHLIGHT_ICON_COMPONENTS[icon] ?? Sparkles;
        return (
          <div key={`${title}-${i}`} className="flex flex-col items-center gap-1 text-center">
            <Icon className="h-7 w-7 text-black" strokeWidth={1.25} />
            <p className="text-xs font-bold text-black">{title}</p>
            {subtitle && <p className="text-[11px] text-[#717171]">{subtitle}</p>}
          </div>
        );
      })}
    </div>
  );
}
