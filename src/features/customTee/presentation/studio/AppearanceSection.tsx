'use client';

import { MIN_OPACITY } from '../../domain/layers';

type Props = { opacity: number; onLive: (opacity: number) => void; onSettle: () => void };

const LABEL = 'mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#717171]';

export default function AppearanceSection({ opacity, onLive, onSettle }: Props) {
  const percent = Math.round(opacity * 100);
  return (
    <div>
      <label htmlFor="layer-opacity" className={LABEL}>
        Opacity · {percent}%
      </label>
      <input
        id="layer-opacity"
        type="range"
        min={Math.round(MIN_OPACITY * 100)}
        max={100}
        value={percent}
        onChange={(e) => onLive(Number(e.target.value) / 100)}
        onPointerUp={onSettle}
        onKeyUp={onSettle}
        onBlur={onSettle}
        className="w-full accent-black"
      />
    </div>
  );
}
