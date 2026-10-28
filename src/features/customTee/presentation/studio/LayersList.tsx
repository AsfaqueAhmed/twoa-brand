'use client';

import { useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, Folder, GripVertical, Trash2, Type } from 'lucide-react';
import type { Layer } from '../../domain/layers';
import { stackUnits } from '../../domain/grouping';

type Props = {
  layers: Layer[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onSetVisible: (ids: string[], visible: boolean) => void;
  onRemove: (ids: string[]) => void;
  onMoveUnit: (id: string, dir: 'up' | 'down') => void;
  onReorderUnit: (id: string, toUnitIndex: number) => void;
  maxRows?: number;
};

const ICON_BTN = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#717171] hover:bg-[#F5F5F5] hover:text-black disabled:cursor-not-allowed disabled:opacity-30';

// Shows the stack top-first; a group is one expandable row, and reordering moves whole units.
export default function LayersList({ layers, selectedIds, onSelect, onSetVisible, onRemove, onMoveUnit, onReorderUnit, maxRows }: Props) {
  const [showAll, setShowAll] = useState(false);
  const dragId = useRef<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const units = stackUnits(layers);
  const byId = new Map(layers.map((l) => [l.id, l]));
  const hasMods = (e: React.MouseEvent) => e.shiftKey || e.metaKey || e.ctrlKey;

  const topFirst = units.map((unit, unitIndex) => ({ unit, unitIndex })).reverse();
  const limited = maxRows !== undefined && topFirst.length > maxRows;

  if (layers.length === 0) {
    return <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">No layers yet. Upload an image or add text to start.</p>;
  }

  const select = (e: React.MouseEvent, ids: string[]) => {
    if (hasMods(e)) {
      const allIn = ids.every((id) => selectedIds.includes(id));
      onSelect(allIn ? selectedIds.filter((id) => !ids.includes(id)) : [...new Set([...selectedIds, ...ids])]);
    } else {
      onSelect(ids);
    }
  };

  const layerRow = (layer: Layer, nested: boolean) => {
    const isSelected = selectedIds.includes(layer.id);
    return (
      <li key={layer.id} className={`flex items-center gap-1 rounded-lg border px-1.5 py-1.5 lg:py-0.5 ${nested ? 'ml-6' : ''} ${isSelected ? 'border-black bg-[#FAF9F6]' : 'border-[#EEEEEE] bg-white'} ${layer.visible ? '' : 'opacity-60'}`}>
        <button type="button" onClick={(e) => select(e, [layer.id])} aria-pressed={isSelected} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md lg:h-7 lg:w-7 bg-[#F5F5F5]">
            {layer.type === 'image' ? <img src={layer.src} alt="" className="h-full w-full object-contain" /> : <Type className="h-4 w-4 text-[#717171]" />}
          </span>
          <span className="truncate text-xs text-black">{layer.name}</span>
        </button>
        <button type="button" aria-label={layer.visible ? 'Hide layer' : 'Show layer'} onClick={() => onSetVisible([layer.id], !layer.visible)} className={ICON_BTN}>
          {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button type="button" aria-label="Delete layer" onClick={() => onRemove([layer.id])} className={ICON_BTN}>
          <Trash2 className="h-4 w-4" />
        </button>
      </li>
    );
  };

  return (
    <ul className="space-y-1.5 lg:space-y-1" aria-label="Design layers">
      {limited && showAll && (
        <li className="list-none">
          <button type="button" onClick={() => setShowAll(false)} className="w-full rounded-lg border border-[#EEEEEE] py-1.5 text-[11px] font-bold uppercase tracking-widest text-black hover:border-black">
            Show less
          </button>
        </li>
      )}
      {topFirst
        .slice(0, limited && !showAll ? maxRows : undefined)
        .map(({ unit, unitIndex }) => {
          const head = unit[0];
          const members = unit.map((id) => byId.get(id)!).reverse(); // top-first
          const isGroup = unit.length > 1;
          const allSelected = unit.every((id) => selectedIds.includes(id));
          const anyVisible = members.some((m) => m.visible);
          const expanded = open[head] ?? true;
          return (
            <li
              key={unit.join('|')}
              draggable
              onDragStart={(e) => {
                dragId.current = head;
                e.dataTransfer.setData('text/plain', head);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                dragId.current = null;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId.current && !unit.includes(dragId.current)) onReorderUnit(dragId.current, unitIndex);
                dragId.current = null;
              }}
              className="list-none"
            >
              {isGroup ? (
                <>
                  <div className={`flex items-center gap-1 rounded-lg border px-1.5 py-1.5 ${allSelected ? 'border-black bg-[#FAF9F6]' : 'border-[#EEEEEE] bg-white'} ${anyVisible ? '' : 'opacity-60'}`}>
                    <span className="cursor-grab text-[#CDCDCD]" aria-hidden="true">
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <button type="button" aria-label={expanded ? 'Collapse group' : 'Expand group'} onClick={() => setOpen((o) => ({ ...o, [head]: !expanded }))} className={ICON_BTN}>
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={(e) => select(e, unit)} aria-pressed={allSelected} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <Folder className="h-4 w-4 shrink-0 text-[#717171]" />
                      <span className="truncate text-xs font-semibold text-black">Group · {unit.length}</span>
                    </button>
                    <button type="button" aria-label="Move group up" disabled={unitIndex === units.length - 1} onClick={() => onMoveUnit(head, 'up')} className={ICON_BTN}>
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Move group down" disabled={unitIndex === 0} onClick={() => onMoveUnit(head, 'down')} className={ICON_BTN}>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={anyVisible ? 'Hide group' : 'Show group'} onClick={() => onSetVisible(unit, !anyVisible)} className={ICON_BTN}>
                      {anyVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button type="button" aria-label="Delete group" onClick={() => onRemove(unit)} className={ICON_BTN}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {expanded && <ul className="mt-1.5 space-y-1.5">{members.map((m) => layerRow(m, true))}</ul>}
                </>
              ) : (
                <div className="flex items-stretch gap-1">
                  <span className="flex cursor-grab items-center text-[#CDCDCD]" aria-hidden="true">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <ul className="min-w-0 flex-1">{layerRow(members[0], false)}</ul>
                  <div className="flex flex-col justify-center">
                    <button type="button" aria-label="Move layer up" disabled={unitIndex === units.length - 1} onClick={() => onMoveUnit(head, 'up')} className={`${ICON_BTN} lg:h-[18px]`}>
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Move layer down" disabled={unitIndex === 0} onClick={() => onMoveUnit(head, 'down')} className={`${ICON_BTN} lg:h-[18px]`}>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      {limited && !showAll && (
        <li className="list-none">
          <button type="button" onClick={() => setShowAll(true)} className="w-full rounded-lg border border-[#EEEEEE] py-1.5 text-[11px] font-bold uppercase tracking-widest text-black hover:border-black">
            {`+${topFirst.length - (maxRows ?? 0)} more`}
          </button>
        </li>
      )}
    </ul>
  );
}
