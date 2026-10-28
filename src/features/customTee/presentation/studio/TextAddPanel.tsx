'use client';

import { TEXT_PRESETS } from '../../domain/layers';

type Props = { onAdd: (init: { text: string; scale: number; bold: boolean }) => void };

const PREVIEW: Record<string, string> = { heading: 'text-2xl font-bold', subheading: 'text-base font-bold', body: 'text-sm' };

export default function TextAddPanel({ onAdd }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-black">Text</h2>
      <div className="space-y-2">
        {TEXT_PRESETS.map((p) => (
          <button
            key={p.kind}
            type="button"
            onClick={() => onAdd({ text: p.text, scale: p.scale, bold: p.bold })}
            className="w-full rounded-lg border border-[#EEEEEE] bg-white px-4 py-4 text-left text-black hover:border-black"
          >
            <span className={PREVIEW[p.kind]}>{p.label}</span>
          </button>
        ))}
      </div>
      <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">
        Select text on the canvas to style it in the Properties panel on the right. Double-click text to edit it in place.
      </p>
    </div>
  );
}
