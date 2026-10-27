'use client';

import { Plus, Minus } from 'lucide-react';

interface AccordionProps {
  sections: { id: string; title: string; content: React.ReactNode }[];
  openId: string | null;
  onToggle: (id: string) => void;
}

export default function Accordion({ sections, openId, onToggle }: AccordionProps) {
  return (
    <div className="border-t border-[#E4E1DA]" id="product-accordions">
      {sections.map((section) => {
        const open = openId === section.id;
        return (
          <div key={section.id} id={`accordion-${section.id}`} className="border-b border-[#E4E1DA]">
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`accordion-panel-${section.id}`}
                onClick={() => onToggle(section.id)}
                className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold text-black"
              >
                {section.title}
                {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            </h3>
            {open && (
              <div id={`accordion-panel-${section.id}`} className="pb-5 text-sm leading-relaxed text-[#4A4A4A]">
                {section.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
