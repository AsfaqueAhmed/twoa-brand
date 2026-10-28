'use client';

type Props = {
  teeName: string;
  colorName?: string;
  size: string;
  layerCount: number;
  onContinue: () => void;
  onStartNew: () => void;
};

export default function SavedDesignChoice({ teeName, colorName, size, layerCount, onContinue, onStartNew }: Props) {
  return (
    <div className="space-y-6 text-center">
      <div>
        <h3 className="text-base font-bold text-black">You have a saved design</h3>
        <p className="mt-1 text-xs text-[#717171]">Pick up where you left off, or begin again with a fresh tee.</p>
      </div>

      <div className="rounded-xl border border-[#EEEEEE] bg-[#FAF9F6] px-4 py-3 text-left">
        <p className="truncate text-sm font-bold text-black">{teeName}</p>
        <p className="mt-0.5 text-xs text-[#717171]">
          {[colorName, `Size ${size}`, `${layerCount} ${layerCount === 1 ? 'layer' : 'layers'}`].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-full bg-black px-8 py-3.5 text-sm font-bold text-white hover:bg-[#333333]"
        >
          Continue editing
        </button>
        <button
          type="button"
          onClick={onStartNew}
          className="w-full rounded-full border border-[#EEEEEE] px-8 py-3.5 text-sm font-bold text-black hover:border-black"
        >
          Start a new design
        </button>
      </div>
    </div>
  );
}
