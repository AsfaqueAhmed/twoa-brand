'use client';

import { useEffect, useRef, useState } from 'react';
import { FlipHorizontal2, FlipVertical2 } from 'lucide-react';
import { type Layer, MAX_SCALE, MIN_SCALE, percentToScale, scaleToPercent } from '../../domain/layers';

type Props = {
  layer: Layer | null;
  onFlip: (axis: 'x' | 'y') => void;
  onScaleLive: (scale: number) => void;
  onSettle: () => void;
};

const LABEL = 'mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#717171]';
const ICON_BTN = 'flex h-9 w-9 items-center justify-center rounded-lg border border-[#EEEEEE] text-black hover:border-black disabled:cursor-not-allowed disabled:text-[#CDCDCD] disabled:hover:border-[#EEEEEE]';
const MIN_PERCENT = scaleToPercent(MIN_SCALE);
const MAX_PERCENT = scaleToPercent(MAX_SCALE);

export default function PositionScalePanel({ layer, onFlip, onScaleLive, onSettle }: Props) {
  const none = !layer;
  const percent = layer ? scaleToPercent(layer.scale) : 100;
  const [text, setText] = useState(String(percent));
  const boxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement !== boxRef.current) setText(String(percent));
  }, [percent, layer?.id]);

  return (
    <div className="space-y-5">
      <div>
        <span className={LABEL}>Flip</span>
        <div className="flex gap-1.5">
          <button type="button" aria-label="Flip horizontal" title="Flip horizontal" disabled={none} onClick={() => onFlip('x')} className={ICON_BTN}>
            <FlipHorizontal2 className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Flip vertical" title="Flip vertical" disabled={none} onClick={() => onFlip('y')} className={ICON_BTN}>
            <FlipVertical2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="layer-scale" className={LABEL}>Scale</label>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-[#EEEEEE] px-3 py-2">
            <input
              aria-label="Scale percent"
              type="number"
              min={MIN_PERCENT}
              max={MAX_PERCENT}
              disabled={none}
              ref={boxRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                const n = e.target.value.trim() === '' ? NaN : Number(e.target.value);
                if (Number.isFinite(n) && n >= MIN_PERCENT && n <= MAX_PERCENT) onScaleLive(percentToScale(n));
              }}
              onBlur={() => {
                setText(String(percent));
                onSettle();
              }}
              className="w-12 bg-transparent text-sm text-black focus:outline-none disabled:text-[#CDCDCD]"
            />
            <span className="text-sm text-[#717171]">%</span>
          </div>
          <input
            id="layer-scale"
            type="range"
            min={MIN_PERCENT}
            max={MAX_PERCENT}
            disabled={none}
            value={percent}
            onChange={(e) => onScaleLive(percentToScale(Number(e.target.value)))}
            onPointerUp={onSettle}
            onKeyUp={onSettle}
            onBlur={onSettle}
            className="flex-1 accent-black"
          />
        </div>
      </div>
    </div>
  );
}
