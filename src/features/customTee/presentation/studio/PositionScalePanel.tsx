'use client';

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  FlipHorizontal2,
  FlipVertical2,
} from 'lucide-react';
import { type AlignEdge, type Layer, MAX_SCALE, MIN_SCALE, percentToScale, scaleToPercent } from '../../domain/layers';

type Props = {
  layer: Layer | null;
  size: { w: number; h: number } | null;
  onAlign: (edge: AlignEdge) => void;
  onFlip: (axis: 'x' | 'y') => void;
  onScaleLive: (scale: number) => void;
  onSettle: () => void;
};

const ALIGN: { edge: AlignEdge; label: string; icon: typeof AlignStartVertical }[] = [
  { edge: 'left', label: 'Align left', icon: AlignStartVertical },
  { edge: 'center', label: 'Align center', icon: AlignCenterVertical },
  { edge: 'right', label: 'Align right', icon: AlignEndVertical },
  { edge: 'top', label: 'Align top', icon: AlignStartHorizontal },
  { edge: 'middle', label: 'Align middle', icon: AlignCenterHorizontal },
  { edge: 'bottom', label: 'Align bottom', icon: AlignEndHorizontal },
];

const LABEL = 'mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#717171]';
const ICON_BTN = 'flex h-9 w-9 items-center justify-center rounded-lg border border-[#EEEEEE] text-black hover:border-black disabled:cursor-not-allowed disabled:text-[#CDCDCD] disabled:hover:border-[#EEEEEE]';
const MIN_PERCENT = scaleToPercent(MIN_SCALE);
const MAX_PERCENT = scaleToPercent(MAX_SCALE);

export default function PositionScalePanel({ layer, size, onAlign, onFlip, onScaleLive, onSettle }: Props) {
  const none = !layer;
  const percent = layer ? scaleToPercent(layer.scale) : 100;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <div>
          <span className={LABEL}>Position</span>
          <div className="flex flex-wrap gap-1.5">
            {ALIGN.map(({ edge, label, icon: Icon }) => (
              <button key={edge} type="button" aria-label={label} title={label} disabled={none || !size} onClick={() => onAlign(edge)} className={ICON_BTN}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
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
              value={percent}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n > 0) onScaleLive(percentToScale(n));
              }}
              onBlur={onSettle}
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
