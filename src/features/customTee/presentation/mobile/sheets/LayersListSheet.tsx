'use client';

import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Image as ImageIcon, Trash2, Type } from 'lucide-react';
import type { Layer } from '../../../domain/layers';

type Props = {
  layers: Layer[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onSetVisible: (id: string, visible: boolean) => void;
  onRemove: (ids: string[]) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSelectLayerToEdit?: (layer: Layer) => void;
};

export default function LayersListSheet({
  layers,
  selectedIds,
  onSelect,
  onSetVisible,
  onRemove,
  onMoveUp,
  onMoveDown,
  onSelectLayerToEdit,
}: Props) {
  // Render in visual stack order: top-most layer (highest index in array) first
  const displayLayers = [...layers].reverse();

  return (
    <div className="space-y-4 pb-6">
      {layers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-400">
          No layers added yet. Add text or designs to see them here.
        </div>
      ) : (
        <div className="space-y-2">
          {displayLayers.map((l) => {
            const isSelected = selectedIds.includes(l.id);
            return (
              <div
                key={l.id}
                onClick={() => {
                  onSelect([l.id]);
                  onSelectLayerToEdit?.(l);
                }}
                className={`flex items-center justify-between gap-2.5 rounded-2xl border p-2.5 transition cursor-pointer active:scale-99 ${
                  isSelected
                    ? 'border-black bg-zinc-50 ring-1 ring-black shadow-xs'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                {/* Drag icon + preview + title */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <GripVertical className="h-4 w-4 shrink-0 text-zinc-400" />
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                    {l.type === 'image' ? (
                      <img src={l.src} alt={l.name} className="h-full w-full object-contain" />
                    ) : (
                      <Type className="h-4 w-4 text-zinc-700" />
                    )}
                  </div>
                  <span className="truncate text-xs font-bold text-zinc-900">{l.name}</span>
                </div>

                {/* Actions: Visibility & Delete */}
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onSetVisible(l.id, !l.visible)}
                    aria-label={l.visible ? 'Hide layer' : 'Show layer'}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                      l.visible ? 'text-zinc-500 hover:text-black' : 'text-zinc-300'
                    }`}
                  >
                    {l.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove([l.id])}
                    aria-label="Delete layer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-red-600 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Layer Reorder Actions */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={selectedIds.length === 0}
          className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 text-xs font-bold text-zinc-900 shadow-2xs hover:bg-zinc-50 active:scale-98 transition disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" />
          <span>Bring Forward</span>
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={selectedIds.length === 0}
          className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 text-xs font-bold text-zinc-900 shadow-2xs hover:bg-zinc-50 active:scale-98 transition disabled:opacity-40"
        >
          <ArrowDown className="h-4 w-4" />
          <span>Send Backward</span>
        </button>
      </div>
    </div>
  );
}
