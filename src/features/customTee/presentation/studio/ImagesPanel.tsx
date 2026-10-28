'use client';

import type { Asset } from '../../application/useStudioState';

type Props = { assets: Asset[]; onAdd: (a: Asset) => void };

export default function ImagesPanel({ assets, onAdd }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-black">Your Images</h2>
      {assets.length === 0 ? (
        <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">Images you upload appear here. Click one to add it again.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {assets.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onAdd(a)}
              className="rounded-lg border border-[#EEEEEE] p-2 text-left hover:border-black"
              title="Add to design"
            >
              <span className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-[#F5F5F5]">
                <img src={a.src} alt={a.name} className="max-h-full max-w-full object-contain" />
              </span>
              <span className="mt-2 block truncate text-[11px] text-[#717171]">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
