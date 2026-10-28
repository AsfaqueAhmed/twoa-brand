'use client';

import { Group, Trash2, Ungroup } from 'lucide-react';
import AppearanceSection from './AppearanceSection';

type Props = {
  count: number;
  isGroup: boolean;
  canGroup: boolean;
  onGroup: () => void;
  onUngroup: () => void;
  onDelete: () => void;
  opacity: number;
  onOpacityLive: (v: number) => void;
  onSettle: () => void;
};

const BTN = 'flex items-center justify-center gap-2 rounded-lg border border-[#EEEEEE] px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-black hover:border-black disabled:cursor-not-allowed disabled:text-[#CDCDCD] disabled:hover:border-[#EEEEEE]';

export default function SelectionInspector({ count, isGroup, canGroup, onGroup, onUngroup, onDelete, opacity, onOpacityLive, onSettle }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-black">{isGroup ? `Group · ${count} layers` : `${count} layers selected`}</p>
      <div className="grid grid-cols-2 gap-2">
        {isGroup ? (
          <button type="button" onClick={onUngroup} className={BTN}>
            <Ungroup className="h-4 w-4" />
            Ungroup
          </button>
        ) : (
          <button type="button" onClick={onGroup} disabled={!canGroup} className={BTN}>
            <Group className="h-4 w-4" />
            Group
          </button>
        )}
        <button type="button" onClick={onDelete} className={`${BTN} hover:!border-red-600 hover:!text-red-600`}>
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
      <p className="text-[10px] text-[#717171]">Shortcuts: Cmd/Ctrl+G group, Cmd/Ctrl+Shift+G ungroup.</p>
      <AppearanceSection opacity={opacity} onLive={onOpacityLive} onSettle={onSettle} />
    </div>
  );
}
