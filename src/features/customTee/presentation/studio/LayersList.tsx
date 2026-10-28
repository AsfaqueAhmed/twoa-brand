'use client';

import { useRef } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Trash2, Type } from 'lucide-react';
import type { Layer } from '../../domain/layers';

type Props = {
  layers: Layer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onReorder: (id: string, toIndex: number) => void;
};

const ICON_BTN = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#717171] hover:bg-[#F5F5F5] hover:text-black disabled:cursor-not-allowed disabled:opacity-30';

// Shows the stack top-first (last array item = top layer).
export default function LayersList({ layers, selectedId, onSelect, onToggle, onRemove, onMove, onReorder }: Props) {
  const dragId = useRef<string | null>(null);
  const topFirst = layers.slice().reverse();

  if (layers.length === 0) {
    return <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">No layers yet. Upload an image or add text to start.</p>;
  }

  return (
    <ul className="space-y-1.5" aria-label="Design layers">
      {topFirst.map((layer, i) => {
        const arrayIndex = layers.length - 1 - i;
        const isSelected = layer.id === selectedId;
        return (
          <li
            key={layer.id}
            draggable
            onDragStart={() => {
              dragId.current = layer.id;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId.current && dragId.current !== layer.id) onReorder(dragId.current, arrayIndex);
              dragId.current = null;
            }}
            className={`flex items-center gap-1 rounded-lg border px-1.5 py-1.5 ${isSelected ? 'border-black bg-[#FAF9F6]' : 'border-[#EEEEEE] bg-white'} ${layer.visible ? '' : 'opacity-60'}`}
          >
            <span className="cursor-grab text-[#CDCDCD]" aria-hidden="true">
              <GripVertical className="h-4 w-4" />
            </span>
            <button type="button" onClick={() => onSelect(layer.id)} aria-pressed={isSelected} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#F5F5F5]">
                {layer.type === 'image' ? (
                  <img src={layer.src} alt="" className="h-full w-full object-contain" />
                ) : (
                  <Type className="h-4 w-4 text-[#717171]" />
                )}
              </span>
              <span className="truncate text-xs text-black">{layer.name}</span>
            </button>
            {isSelected && (
              <>
                <button type="button" aria-label="Move layer up" disabled={arrayIndex === layers.length - 1} onClick={() => onMove(layer.id, 'up')} className={ICON_BTN}>
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Move layer down" disabled={arrayIndex === 0} onClick={() => onMove(layer.id, 'down')} className={ICON_BTN}>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </>
            )}
            <button type="button" aria-label={layer.visible ? 'Hide layer' : 'Show layer'} onClick={() => onToggle(layer.id)} className={ICON_BTN}>
              {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button type="button" aria-label="Delete layer" onClick={() => onRemove(layer.id)} className={ICON_BTN}>
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
