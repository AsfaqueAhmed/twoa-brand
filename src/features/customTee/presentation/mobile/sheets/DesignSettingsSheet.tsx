'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Trash2,
} from 'lucide-react';
import {
  type AlignEdge,
  type Layer,
  type LayerPatch,
  MAX_SCALE,
  MIN_SCALE,
  percentToScale,
  scaleToPercent,
} from '../../../domain/layers';

type Props = {
  layer: Layer;
  onPatch: (patch: LayerPatch) => void;
  onLive: (patch: LayerPatch) => void;
  onSettle: () => void;
  onAlign: (edge: AlignEdge) => void;
  onFlip: (axis: 'x' | 'y') => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const MIN_PERCENT = scaleToPercent(MIN_SCALE);
const MAX_PERCENT = scaleToPercent(MAX_SCALE);

const LABEL = 'mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500';
const ICON_BTN =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-black active:scale-95 transition';

const ALIGN: { edge: AlignEdge; label: string; icon: typeof AlignStartVertical }[] = [
  { edge: 'left', label: 'Align left', icon: AlignStartVertical },
  { edge: 'center', label: 'Align center', icon: AlignCenterVertical },
  { edge: 'right', label: 'Align right', icon: AlignEndVertical },
  { edge: 'top', label: 'Align top', icon: AlignStartHorizontal },
  { edge: 'middle', label: 'Align middle', icon: AlignCenterHorizontal },
  { edge: 'bottom', label: 'Align bottom', icon: AlignEndHorizontal },
];

// Same properties as the web studio: flip, scale (slider + percent) and arrange. Rotation is the canvas handle.
export default function DesignSettingsSheet({
  layer,
  onLive,
  onSettle,
  onAlign,
  onFlip,
  onDuplicate,
  onDelete,
}: Props) {
  const percent = scaleToPercent(layer.scale);
  const [text, setText] = useState(String(percent));
  const boxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement !== boxRef.current) setText(String(percent));
  }, [percent, layer.id]);

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {layer.type === 'image' ? (
              <img src={layer.src} alt={layer.name} className="h-full w-full object-contain" />
            ) : (
              <span className="font-bold text-sm text-zinc-800 truncate px-1">{layer.text.slice(0, 3)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xs font-bold text-zinc-900">{layer.name}</h3>
            <p className="text-[11px] font-medium text-zinc-500">{layer.type === 'image' ? 'Image' : 'Text'}</p>
          </div>
        </div>
      </div>

      <div>
        <span className={LABEL}>Flip</span>
        <div className="flex gap-2">
          <button type="button" aria-label="Flip horizontal" aria-pressed={!!layer.flipX} onClick={() => onFlip('x')} className={`${ICON_BTN} ${layer.flipX ? '!border-black !bg-black !text-white' : ''}`}>
            <FlipHorizontal2 className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Flip vertical" aria-pressed={!!layer.flipY} onClick={() => onFlip('y')} className={`${ICON_BTN} ${layer.flipY ? '!border-black !bg-black !text-white' : ''}`}>
            <FlipVertical2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="layer-scale" className={LABEL}>Scale</label>
        <div className="flex items-center gap-3">
          <input
            id="layer-scale"
            type="range"
            min={MIN_PERCENT}
            max={MAX_PERCENT}
            value={percent}
            onChange={(e) => onLive({ scale: percentToScale(Number(e.target.value)) })}
            onPointerUp={onSettle}
            onKeyUp={onSettle}
            onBlur={onSettle}
            className="min-w-0 flex-1 accent-black"
          />
          <div className="flex shrink-0 items-center rounded-xl border border-zinc-200 px-3 py-2">
            <input
              aria-label="Scale percent"
              type="number"
              min={MIN_PERCENT}
              max={MAX_PERCENT}
              ref={boxRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                const n = e.target.value.trim() === '' ? NaN : Number(e.target.value);
                if (Number.isFinite(n) && n >= MIN_PERCENT && n <= MAX_PERCENT) onLive({ scale: percentToScale(n) });
              }}
              onBlur={() => {
                setText(String(percent));
                onSettle();
              }}
              className="w-12 bg-transparent text-sm font-bold text-zinc-900 focus:outline-none"
            />
            <span className="text-sm text-zinc-500">%</span>
          </div>
        </div>
      </div>

      <div>
        <span className={LABEL}>Arrange</span>
        <div className="flex flex-wrap gap-2">
          {ALIGN.map(({ edge, label, icon: Icon }) => (
            <button key={edge} type="button" aria-label={label} title={label} onClick={() => onAlign(edge)} className={ICON_BTN}>
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={onDuplicate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 text-xs font-bold text-zinc-900 hover:bg-zinc-50 active:scale-98 transition"
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
