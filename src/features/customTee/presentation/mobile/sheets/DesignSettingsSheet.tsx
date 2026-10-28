'use client';

import { useState } from 'react';
import {
  AlignCenter,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalSpaceAround,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignVerticalDistributeCenter,
  AlignVerticalJustifyCenter,
  AlignVerticalSpaceAround,
  Copy,
  FlipHorizontal,
  FlipVertical,
  Lock,
  Trash2,
  Unlock,
} from 'lucide-react';
import type { AlignEdge, Layer, LayerPatch } from '../../../domain/layers';

type Props = {
  layer: Layer;
  onPatch: (patch: LayerPatch) => void;
  onAlign: (edge: AlignEdge) => void;
  onFlip: (axis: 'x' | 'y') => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

// Map fractional canvas coordinates to practical inches display (assuming 10in printable area)
const PRINT_AREA_INCHES = 10;

export default function DesignSettingsSheet({
  layer,
  onPatch,
  onAlign,
  onFlip,
  onDuplicate,
  onDelete,
}: Props) {
  const [aspectLocked, setAspectLocked] = useState(true);

  // Position in inches relative to center (0, 0 at center or absolute inches)
  const posXInches = ((layer.x - 0.5) * PRINT_AREA_INCHES).toFixed(1);
  const posYInches = ((layer.y - 0.5) * PRINT_AREA_INCHES).toFixed(1);

  // Dimensions in inches
  const aspect = layer.type === 'image' ? layer.aspect || 1 : 2.5;
  const widthInches = (layer.scale * PRINT_AREA_INCHES).toFixed(1);
  const heightInches = (layer.scale * (PRINT_AREA_INCHES / aspect)).toFixed(1);

  const opacityPct = Math.round((layer.opacity ?? 1) * 100);

  const handleRotationChange = (deg: number) => {
    onPatch({ rotation: deg });
  };

  const handleOpacityChange = (pct: number) => {
    onPatch({ opacity: Math.max(0.1, Math.min(1, pct / 100)) });
  };

  const handleWidthChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val) && val > 0.5 && val <= 15) {
      onPatch({ scale: val / PRINT_AREA_INCHES });
    }
  };

  const handleHeightChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val) && val > 0.5 && val <= 15) {
      onPatch({ scale: (val * aspect) / PRINT_AREA_INCHES });
    }
  };

  const handleXChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      onPatch({ x: Math.max(0, Math.min(1, val / PRINT_AREA_INCHES + 0.5)) });
    }
  };

  const handleYChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      onPatch({ y: Math.max(0, Math.min(1, val / PRINT_AREA_INCHES + 0.5)) });
    }
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Selected Layer Card */}
      <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {layer.type === 'image' ? (
              <img src={layer.src} alt={layer.name} className="h-full w-full object-contain" />
            ) : (
              <span className="font-bold text-sm text-zinc-800 truncate px-1">
                {layer.text.slice(0, 3)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xs font-bold text-zinc-900">{layer.name}</h3>
            <p className="text-[11px] font-medium text-zinc-500">
              {layer.type === 'image'
                ? `${widthInches}" × ${heightInches}" • Layer`
                : `${layer.fontFamily.split(',')[0].replace(/['"]/g, '')}`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete layer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-red-50 hover:text-red-600 active:scale-95 transition"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Position Section */}
      <div>
        <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
          Position
        </span>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center rounded-xl border border-zinc-200 bg-white px-3 py-2 focus-within:border-black transition">
            <span className="text-xs font-bold text-zinc-400 mr-2">X</span>
            <input
              type="text"
              defaultValue={`${posXInches} in`}
              key={`x-${posXInches}`}
              onBlur={(e) => handleXChange(e.target.value.replace(/[^0-9.-]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleXChange((e.target as HTMLInputElement).value.replace(/[^0-9.-]/g, ''));
              }}
              className="w-full text-xs font-bold text-zinc-900 focus:outline-none"
            />
          </div>
          <div className="flex items-center rounded-xl border border-zinc-200 bg-white px-3 py-2 focus-within:border-black transition">
            <span className="text-xs font-bold text-zinc-400 mr-2">Y</span>
            <input
              type="text"
              defaultValue={`${posYInches} in`}
              key={`y-${posYInches}`}
              onBlur={(e) => handleYChange(e.target.value.replace(/[^0-9.-]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleYChange((e.target as HTMLInputElement).value.replace(/[^0-9.-]/g, ''));
              }}
              className="w-full text-xs font-bold text-zinc-900 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Size Section with Aspect Lock */}
      <div>
        <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
          Size
        </span>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center rounded-xl border border-zinc-200 bg-white px-3 py-2 focus-within:border-black transition">
            <span className="text-xs font-bold text-zinc-400 mr-2">W</span>
            <input
              type="text"
              defaultValue={`${widthInches} in`}
              key={`w-${widthInches}`}
              onBlur={(e) => handleWidthChange(e.target.value.replace(/[^0-9.-]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleWidthChange((e.target as HTMLInputElement).value.replace(/[^0-9.-]/g, ''));
              }}
              className="w-full text-xs font-bold text-zinc-900 focus:outline-none"
            />
          </div>
          <div className="flex flex-1 items-center rounded-xl border border-zinc-200 bg-white px-3 py-2 focus-within:border-black transition">
            <span className="text-xs font-bold text-zinc-400 mr-2">H</span>
            <input
              type="text"
              defaultValue={`${heightInches} in`}
              key={`h-${heightInches}`}
              onBlur={(e) => handleHeightChange(e.target.value.replace(/[^0-9.-]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleHeightChange((e.target as HTMLInputElement).value.replace(/[^0-9.-]/g, ''));
              }}
              className="w-full text-xs font-bold text-zinc-900 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setAspectLocked(!aspectLocked)}
            aria-label={aspectLocked ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
              aspectLocked
                ? 'border-zinc-300 bg-zinc-100 text-black'
                : 'border-zinc-200 bg-white text-zinc-400'
            }`}
          >
            {aspectLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Rotate Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Rotate</span>
          <span className="text-xs font-mono font-bold text-zinc-900">{Math.round(layer.rotation)}°</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={Math.round(layer.rotation)}
            onChange={(e) => handleRotationChange(parseInt(e.target.value, 10))}
            className="w-full accent-black cursor-pointer"
          />
        </div>
      </div>

      {/* Flip Section */}
      <div>
        <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
          Flip
        </span>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onFlip('x')}
            className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition active:scale-98 ${
              layer.flipX ? 'border-black bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700'
            }`}
          >
            <FlipHorizontal className="h-4 w-4" />
            <span>Flip H</span>
          </button>
          <button
            type="button"
            onClick={() => onFlip('y')}
            className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition active:scale-98 ${
              layer.flipY ? 'border-black bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700'
            }`}
          >
            <FlipVertical className="h-4 w-4" />
            <span>Flip V</span>
          </button>
        </div>
      </div>

      {/* Align Section (6 buttons) */}
      <div>
        <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
          Align
        </span>
        <div className="grid grid-cols-6 gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-50 p-1.5">
          <button
            type="button"
            onClick={() => onAlign('left')}
            title="Align Left"
            className="flex h-9 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-2xs hover:bg-zinc-100 hover:text-black active:scale-95 transition"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onAlign('center')}
            title="Align Center Horizontal"
            className="flex h-9 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-2xs hover:bg-zinc-100 hover:text-black active:scale-95 transition"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onAlign('right')}
            title="Align Right"
            className="flex h-9 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-2xs hover:bg-zinc-100 hover:text-black active:scale-95 transition"
          >
            <AlignRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onAlign('top')}
            title="Align Top"
            className="flex h-9 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-2xs hover:bg-zinc-100 hover:text-black active:scale-95 transition"
          >
            <span className="rotate-90">
              <AlignLeft className="h-4 w-4" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => onAlign('middle')}
            title="Align Middle Vertical"
            className="flex h-9 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-2xs hover:bg-zinc-100 hover:text-black active:scale-95 transition"
          >
            <span className="rotate-90">
              <AlignCenter className="h-4 w-4" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => onAlign('bottom')}
            title="Align Bottom"
            className="flex h-9 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-2xs hover:bg-zinc-100 hover:text-black active:scale-95 transition"
          >
            <span className="rotate-90">
              <AlignRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>

      {/* Opacity Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Opacity</span>
          <span className="text-xs font-mono font-bold text-zinc-900">{opacityPct}%</span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          step={1}
          value={opacityPct}
          onChange={(e) => handleOpacityChange(parseInt(e.target.value, 10))}
          className="w-full accent-black cursor-pointer"
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={onDuplicate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 text-xs font-bold text-zinc-900 shadow-2xs hover:bg-zinc-50 active:scale-98 transition"
        >
          <Copy className="h-4 w-4" />
          <span>Duplicate Layer</span>
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50/70 py-3 text-xs font-bold text-red-600 hover:bg-red-100 active:scale-98 transition"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete Layer</span>
        </button>
      </div>
    </div>
  );
}
