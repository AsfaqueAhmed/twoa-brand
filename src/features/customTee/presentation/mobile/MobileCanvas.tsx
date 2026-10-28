'use client';

import { useRef, useState, useEffect } from 'react';
import {
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
} from 'lucide-react';
import type { Layer, LayerPatch } from '../../domain/layers';
import { TEXT_FONT_FRACTION } from '../../domain/layers';
import type { StudioView } from '../../domain/views';

export type MobileCanvasHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
};

type Props = {
  views: StudioView[];
  activeViewId: string;
  onSelectView: (viewId: string) => void;
  baseImage?: string;
  baseAlt: string;
  layers: Layer[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onLiveChange: (patches: Record<string, LayerPatch>) => void;
  onSettle: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenSettings?: () => void;
};

const STAGE_BASE_PX = 460;

export default function MobileCanvas({
  views,
  activeViewId,
  onSelectView,
  baseImage,
  baseAlt,
  layers,
  selectedIds,
  onSelect,
  onLiveChange,
  onSettle,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenSettings,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  // Drag interaction state
  const dragRef = useRef<{
    pointerId: number;
    kind: 'move' | 'scale' | 'rotate';
    layerId: string;
    startX: number;
    startY: number;
    startLayerX: number;
    startLayerY: number;
    startScale: number;
    startRotation: number;
    handleCorner?: string;
  } | null>(null);

  const selectedLayer = layers.find((l) => selectedIds.includes(l.id));

  // Handle pointer down on a layer (move)
  const onLayerPointerDown = (e: React.PointerEvent, layer: Layer) => {
    e.stopPropagation();
    onSelect([layer.id]);
    onOpenSettings?.();

    const stageEl = stageRef.current;
    if (!stageEl) return;
    const stageRect = stageEl.getBoundingClientRect();

    dragRef.current = {
      pointerId: e.pointerId,
      kind: 'move',
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      startLayerX: layer.x,
      startLayerY: layer.y,
      startScale: layer.scale,
      startRotation: layer.rotation,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Handle pointer down on a scale handle
  const onScaleHandlePointerDown = (e: React.PointerEvent, layer: Layer, corner: string) => {
    e.stopPropagation();
    dragRef.current = {
      pointerId: e.pointerId,
      kind: 'scale',
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      startLayerX: layer.x,
      startLayerY: layer.y,
      startScale: layer.scale,
      startRotation: layer.rotation,
      handleCorner: corner,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Handle pointer down on rotation handle
  const onRotateHandlePointerDown = (e: React.PointerEvent, layer: Layer) => {
    e.stopPropagation();
    dragRef.current = {
      pointerId: e.pointerId,
      kind: 'rotate',
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      startLayerX: layer.x,
      startLayerY: layer.y,
      startScale: layer.scale,
      startRotation: layer.rotation,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Pointer move handler
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const stageRect = stageEl.getBoundingClientRect();

    if (drag.kind === 'move') {
      const dxPx = (e.clientX - drag.startX) / zoom;
      const dyPx = (e.clientY - drag.startY) / zoom;
      const nx = Math.max(0.05, Math.min(0.95, drag.startLayerX + dxPx / stageRect.width));
      const ny = Math.max(0.05, Math.min(0.95, drag.startLayerY + dyPx / stageRect.height));
      onLiveChange({ [drag.layerId]: { x: nx, y: ny } });
    } else if (drag.kind === 'scale') {
      const dxPx = (e.clientX - drag.startX) / zoom;
      const dyPx = (e.clientY - drag.startY) / zoom;
      const delta = (dxPx + dyPx) / stageRect.width;
      const nextScale = Math.max(0.1, Math.min(1.4, drag.startScale + delta));
      onLiveChange({ [drag.layerId]: { scale: nextScale } });
    } else if (drag.kind === 'rotate') {
      // Calculate angle from layer center to current pointer
      const layerCenterX = stageRect.left + drag.startLayerX * stageRect.width;
      const layerCenterY = stageRect.top + drag.startLayerY * stageRect.height;
      const angleRad = Math.atan2(e.clientY - layerCenterY, e.clientX - layerCenterX);
      const angleDeg = (angleRad * 180) / Math.PI + 90; // offset so top handle is 0
      onLiveChange({ [drag.layerId]: { rotation: Math.round(angleDeg) } });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      dragRef.current = null;
      onSettle();
    }
  };

  const toggleZoom = () => {
    setZoom((z) => (z === 1 ? 1.35 : 1));
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-stone-100 via-stone-50 to-stone-100 select-none min-h-[360px]"
      onPointerDown={(e) => {
        // Tap on empty canvas deselects
        if (e.target === containerRef.current || e.target === stageRef.current) {
          onSelect([]);
        }
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Top Floating Controls: Undo/Redo & Zoom */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Undo / Redo Pill */}
        <div className="pointer-events-auto flex items-center divide-x divide-zinc-200 rounded-full border border-zinc-200/80 bg-white/95 px-1 py-1 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 active:scale-90 transition disabled:opacity-30"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 active:scale-90 transition disabled:opacity-30"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        {/* Zoom & Fit Pill */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-zinc-200/80 bg-white/95 px-2.5 py-1 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={toggleZoom}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 hover:text-black active:scale-95 transition"
          >
            <Search className="h-3.5 w-3.5 text-zinc-500" />
            <span>{Math.round(zoom * 100)}%</span>
            <Maximize2 className="h-3.5 w-3.5 text-zinc-400 ml-1" />
          </button>
        </div>
      </div>

      {/* Canvas Stage */}
      <div
        ref={stageRef}
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative aspect-square w-full max-w-[420px] max-h-[60vh] shrink-0 touch-none flex items-center justify-center p-2"
      >
        {/* Shirt Base Image */}
        {baseImage ? (
          <img
            src={baseImage}
            alt={baseAlt}
            draggable={false}
            className="h-full w-full object-contain pointer-events-none drop-shadow-md select-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-3xl bg-zinc-200/60 text-zinc-400 text-xs">
            Loading preview...
          </div>
        )}

        {/* Layers Container (chest print zone) */}
        <div className="absolute inset-0 pointer-events-none">
          {layers
            .filter((l) => l.visible)
            .map((l) => {
              const isSelected = selectedIds.includes(l.id);
              const isImage = l.type === 'image';
              const scale = l.scale;
              const rotation = l.rotation || 0;
              const flipX = l.flipX ? -1 : 1;
              const flipY = l.flipY ? -1 : 1;
              const opacity = l.opacity ?? 1;

              return (
                <div
                  key={l.id}
                  style={{
                    position: 'absolute',
                    left: `${l.x * 100}%`,
                    top: `${l.y * 100}%`,
                    transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${flipX}, ${flipY})`,
                    opacity,
                  }}
                  className="pointer-events-auto cursor-move select-none"
                  onPointerDown={(e) => onLayerPointerDown(e, l)}
                >
                  {/* Layer Content */}
                  {isImage ? (
                    <div
                      style={{
                        width: `${scale * STAGE_BASE_PX}px`,
                        aspectRatio: l.aspect || 1,
                      }}
                      className="relative flex items-center justify-center"
                    >
                      <img
                        src={l.src}
                        alt={l.name}
                        draggable={false}
                        className="h-full w-full object-contain pointer-events-none select-none"
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        fontFamily: l.fontFamily,
                        fontSize: `${scale * TEXT_FONT_FRACTION * STAGE_BASE_PX}px`,
                        color: l.color,
                        fontWeight: l.bold ? 'bold' : 'normal',
                        fontStyle: l.italic ? 'italic' : 'normal',
                        textAlign: l.align,
                        letterSpacing: `${l.letterSpacing}em`,
                        lineHeight: 1.2,
                        whiteSpace: 'pre',
                      }}
                      className="px-2 py-1 select-none"
                    >
                      {l.text}
                    </div>
                  )}

                  {/* Bounding Box & Handles when Selected */}
                  {isSelected && (
                    <div
                      className="absolute inset-0 -m-1 border-2 border-white shadow-xs rounded-sm pointer-events-none"
                      style={{
                        outline: '1.5px dashed rgba(0, 0, 0, 0.7)',
                        outlineOffset: '0px',
                      }}
                    >
                      {/* Top Rotation Handle with ↻ icon */}
                      <div
                        onPointerDown={(e) => onRotateHandlePointerDown(e, l)}
                        className="pointer-events-auto absolute -top-9 left-1/2 -translate-x-1/2 flex h-6 w-6 cursor-grab items-center justify-center rounded-full bg-white text-zinc-900 shadow-md border border-zinc-200 active:scale-110 active:cursor-grabbing transition"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </div>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-3 w-0.5 bg-white shadow-xs" />

                      {/* 4 Corner Scale Handles */}
                      <div
                        onPointerDown={(e) => onScaleHandlePointerDown(e, l, 'nw')}
                        className="pointer-events-auto absolute -top-1.5 -left-1.5 h-3.5 w-3.5 rounded-sm border-2 border-zinc-900 bg-white shadow-xs cursor-nwse-resize active:scale-125 transition"
                      />
                      <div
                        onPointerDown={(e) => onScaleHandlePointerDown(e, l, 'ne')}
                        className="pointer-events-auto absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-sm border-2 border-zinc-900 bg-white shadow-xs cursor-nesw-resize active:scale-125 transition"
                      />
                      <div
                        onPointerDown={(e) => onScaleHandlePointerDown(e, l, 'sw')}
                        className="pointer-events-auto absolute -bottom-1.5 -left-1.5 h-3.5 w-3.5 rounded-sm border-2 border-zinc-900 bg-white shadow-xs cursor-nesw-resize active:scale-125 transition"
                      />
                      <div
                        onPointerDown={(e) => onScaleHandlePointerDown(e, l, 'se')}
                        className="pointer-events-auto absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 rounded-sm border-2 border-zinc-900 bg-white shadow-xs cursor-nwse-resize active:scale-125 transition"
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Bottom Floating Controls: Front / Back Toggle & Thumbnails */}
      <div className="absolute bottom-3 left-0 right-0 z-20 flex flex-col items-center gap-2.5 pointer-events-none">
        {/* Front / Back Pill Segmented Control */}
        {views.length >= 2 && (
          <div className="pointer-events-auto flex rounded-full bg-white/95 p-1 border border-zinc-200 shadow-md backdrop-blur-md">
            {views.map((v) => {
              const isActive = v.id === activeViewId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectView(v.id)}
                  className={`rounded-full px-5 py-1.5 text-xs font-bold transition active:scale-95 ${
                    isActive
                      ? 'bg-black text-white shadow-xs'
                      : 'text-zinc-700 hover:text-black'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Thumbnail Preview Strip */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/95 p-1.5 shadow-md backdrop-blur-md">
          {views.map((v) => {
            const isActive = v.id === activeViewId;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectView(v.id)}
                className={`relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 transition active:scale-95 ${
                  isActive ? 'border-black shadow-xs' : 'border-zinc-200 opacity-60 hover:opacity-100'
                }`}
              >
                {v.image ? (
                  <img src={v.image} alt={v.label} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-zinc-600">{v.label.slice(0, 2)}</span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              const currentIndex = views.findIndex((v) => v.id === activeViewId);
              const nextIndex = (currentIndex + 1) % views.length;
              if (views[nextIndex]) onSelectView(views[nextIndex].id);
            }}
            title="Switch view"
            aria-label="Add or switch view angle"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-zinc-300 text-zinc-400 hover:border-black hover:text-black active:scale-95 transition"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
