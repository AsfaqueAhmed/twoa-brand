'use client';

import { Brush, Image as ImageIcon, Layers, Type } from 'lucide-react';

export type ToolTab = 'design' | 'text' | 'images' | 'layers';

const TABS = [
  { id: 'design', label: 'Design', icon: Brush },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'layers', label: 'Layers', icon: Layers },
] as const;

export default function ToolRail({ active, onChange, className = '' }: { active: ToolTab; onChange: (t: ToolTab) => void; className?: string }) {
  return (
    <nav aria-label="Studio tools" className={`flex gap-1 border-b border-[#EEEEEE] p-2 lg:flex-col lg:border-b-0 lg:border-r ${className}`}>
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={active === id}
          onClick={() => onChange(id)}
          className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors lg:flex-none ${
            active === id ? 'bg-black text-white' : 'text-[#717171] hover:bg-[#F5F5F5] hover:text-black'
          }`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
    </nav>
  );
}
