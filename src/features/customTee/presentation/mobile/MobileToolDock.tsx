'use client';

import { Edit3, Image as ImageIcon, Layers as LayersIcon, Type } from 'lucide-react';

export type MobileToolTab = 'design' | 'text' | 'images' | 'layers';

type Props = {
  activeTab: MobileToolTab | null;
  onSelectTab: (tab: MobileToolTab) => void;
};

const ITEMS: { id: MobileToolTab; label: string; icon: typeof Edit3 }[] = [
  { id: 'design', label: 'Design', icon: Edit3 },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'layers', label: 'Layers', icon: LayersIcon },
];

export default function MobileToolDock({ activeTab, onSelectTab }: Props) {
  return (
    <nav
      aria-label="Tool Navigation"
      className="sticky bottom-0 z-20 w-full border-t border-[#EEEEEE] bg-white/95 backdrop-blur-md px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-label={label}
              className={`flex flex-col items-center justify-center rounded-2xl py-2 px-1 transition-all active:scale-95 ${
                isActive
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-black'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="mt-1 text-[11px] font-semibold tracking-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
