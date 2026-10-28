'use client';

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
} from 'lucide-react';
import type { AlignEdge } from '../../domain/layers';

type Props = {
  disabled: boolean;
  canDistribute: boolean;
  onAlign: (edge: AlignEdge) => void;
  onDistribute: (axis: 'horizontal' | 'vertical') => void;
};

const ALIGN: { edge: AlignEdge; label: string; icon: typeof AlignStartVertical }[] = [
  { edge: 'left', label: 'Align left', icon: AlignStartVertical },
  { edge: 'center', label: 'Align center', icon: AlignCenterVertical },
  { edge: 'right', label: 'Align right', icon: AlignEndVertical },
  { edge: 'top', label: 'Align top', icon: AlignStartHorizontal },
  { edge: 'middle', label: 'Align middle', icon: AlignCenterHorizontal },
  { edge: 'bottom', label: 'Align bottom', icon: AlignEndHorizontal },
];

const LABEL = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#717171]';
const ICON_BTN = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EEEEEE] text-black hover:border-black disabled:cursor-not-allowed disabled:text-[#CDCDCD] disabled:hover:border-[#EEEEEE]';

export default function AlignPanel({ disabled, canDistribute, onAlign, onDistribute }: Props) {
  return (
    <div>
      <span className={LABEL}>Arrange</span>
      <div className="flex gap-1">
        {ALIGN.map(({ edge, label, icon: Icon }) => (
          <button key={edge} type="button" aria-label={label} title={label} disabled={disabled} onClick={() => onAlign(edge)} className={ICON_BTN}>
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <span className="mx-0.5 h-8 w-px shrink-0 bg-[#EEEEEE]" aria-hidden="true" />
        <button type="button" aria-label="Distribute horizontally" title="Distribute horizontally" disabled={disabled || !canDistribute} onClick={() => onDistribute('horizontal')} className={ICON_BTN}>
          <AlignHorizontalDistributeCenter className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Distribute vertically" title="Distribute vertically" disabled={disabled || !canDistribute} onClick={() => onDistribute('vertical')} className={ICON_BTN}>
          <AlignVerticalDistributeCenter className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
