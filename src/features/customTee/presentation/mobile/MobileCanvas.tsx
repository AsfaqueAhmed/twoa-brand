'use client';

import { useRef, useState, useEffect } from 'react';
import { Maximize2, RotateCcw, RotateCw, Search } from 'lucide-react';
import type { Layer, LayerPatch } from '../../domain/layers';
import { MAX_SCALE, MIN_SCALE, TEXT_FONT_FRACTION, normalizeRotation } from '../../domain/layers';
import type { StudioView } from '../../domain/views';
import { type Box, type CanvasPx, type Size, layerBox, limitMoveDelta } from '../../domain/geometry';
import { type Guide, snapAngle, snapBox } from '../../domain/snapping';

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
  /** Reports the stage size and every visible layer's unrotated box (canvas fractions) for align/snap. */
  /** A property sheet is open below: shrink the stage into the space above it so the design stays visible. */
  compact?: boolean;
  onMeasure?: (m: { stage: CanvasPx; sizes: Record<string, Size> }) => void;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const TAP_ZOOM = 1.35;
const SNAP_PX = 6;

type Drag = {
  pointerId: number;
  kind: 'move' | 'scale' | 'rotate';
  layerId: string;
  startX: number;
  startY: number;
  startLayerX: number;
  startLayerY: number;
  startScale: number;
  startDist: number;
  startBox?: Box;
  others: Box[];
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

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
  onMeasure,
  compact = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  // Unscaled stage width: layer sizes are fractions of it, exactly like the desktop canvas.
  const [stageW, setStageW] = useState(0);
  const [guides, setGuides] = useState<Guide[]>([]);
  const sizesRef = useRef<Record<string, Size>>({});
  const lastMeasure = useRef('');

  const dragRef = useRef<Drag | null>(null);
  const pinchPointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStageW(el.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Report every visible layer's unrotated box (as canvas fractions) for snapping, align and distribute.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !stage.offsetWidth || !stage.offsetHeight) return;
    const next: Record<string, Size> = {};
    for (const l of layers) {
      if (!l.visible) continue;
      const content = stage.querySelector<HTMLElement>(`[data-layer-id="${CSS.escape(l.id)}"] [data-layer-content]`);
      if (content) next[l.id] = { w: content.offsetWidth / stage.offsetWidth, h: content.offsetHeight / stage.offsetHeight };
    }
    const key = `${stage.offsetWidth}x${stage.offsetHeight}|` + Object.entries(next).map(([id, sz]) => `${id}:${sz.w.toFixed(4)},${sz.h.toFixed(4)}`).join(';');
    if (key !== lastMeasure.current) {
      lastMeasure.current = key;
      sizesRef.current = next;
      onMeasure?.({ stage: { w: stage.offsetWidth, h: stage.offsetHeight }, sizes: next });
    }
  });

  const centerOf = (layerX: number, layerY: number) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return { x: rect.left + layerX * rect.width, y: rect.top + layerY * rect.height, rect };
  };

  const beginDrag = (e: React.PointerEvent, layer: Layer, kind: Drag['kind']) => {
    e.stopPropagation();
    if (!stageRef.current) return;
    const c = centerOf(layer.x, layer.y);
    const canvas = { w: stageRef.current.offsetWidth, h: stageRef.current.offsetHeight };
    const sizes = sizesRef.current;
    const startBox = sizes[layer.id] ? layerBox(layer, sizes[layer.id], canvas) : undefined;
    const others = layers.filter((o) => o.visible && o.id !== layer.id && sizes[o.id]).map((o) => layerBox(o, sizes[o.id], canvas));
    dragRef.current = {
      pointerId: e.pointerId,
      kind,
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      startLayerX: layer.x,
      startLayerY: layer.y,
      startScale: layer.scale,
      startDist: Math.max(1, Math.hypot(e.clientX - c.x, e.clientY - c.y)),
      startBox,
      others,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onLayerPointerDown = (e: React.PointerEvent, layer: Layer) => {
    onSelect([layer.id]);
    beginDrag(e, layer, 'move');
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pinchPointers.current.has(e.pointerId)) {
      pinchPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...pinchPointers.current.values()];
      if (pts.length === 2 && pinchStart.current) {
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        setZoom(clamp(pinchStart.current.zoom * (dist / pinchStart.current.dist), MIN_ZOOM, MAX_ZOOM));
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (!stageRef.current) return;
    // The stage rect already includes the zoom transform, so screen deltas divide by it directly.
    const rect = stageRef.current.getBoundingClientRect();

    if (drag.kind === 'move') {
      let dx = (e.clientX - drag.startX) / rect.width;
      let dy = (e.clientY - drag.startY) / rect.height;
      let found: Guide[] = [];
      if (drag.startBox) {
        const moved: Box = { left: drag.startBox.left + dx, right: drag.startBox.right + dx, top: drag.startBox.top + dy, bottom: drag.startBox.bottom + dy };
        const snap = snapBox(moved, drag.others, { x: SNAP_PX / rect.width, y: SNAP_PX / rect.height });
        dx += snap.dx;
        dy += snap.dy;
        found = snap.guides;
      }
      const start = layers.find((l) => l.id === drag.layerId);
      if (start) ({ dx, dy } = limitMoveDelta([{ ...start, x: drag.startLayerX, y: drag.startLayerY }], [drag.layerId], dx, dy));
      setGuides(found);
      onLiveChange({ [drag.layerId]: { x: drag.startLayerX + dx, y: drag.startLayerY + dy } });
    } else if (drag.kind === 'scale') {
      // Any corner: scale by how far the pointer is from the layer centre, relative to where the drag began.
      const c = centerOf(drag.startLayerX, drag.startLayerY);
      const dist = Math.hypot(e.clientX - c.x, e.clientY - c.y);
      onLiveChange({ [drag.layerId]: { scale: clamp(drag.startScale * (dist / drag.startDist), MIN_SCALE, MAX_SCALE) } });
    } else {
      const c = centerOf(drag.startLayerX, drag.startLayerY);
      const deg = (Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180) / Math.PI + 90; // top handle reads as 0°
      onLiveChange({ [drag.layerId]: { rotation: Math.round(snapAngle(normalizeRotation(deg), 15, 4)) } });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (pinchPointers.current.delete(e.pointerId)) {
      if (pinchPointers.current.size < 2) pinchStart.current = null;
      return;
    }
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      dragRef.current = null;
      setGuides([]);
      onSettle();
    }
  };

  const onContainerPointerDown = (e: React.PointerEvent) => {
    // Layers and handles stop propagation, so only empty-canvas touches get here.
    if (e.target === containerRef.current || e.target === stageRef.current) {
      if (pinchPointers.current.size === 0) onSelect([]);
      pinchPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinchPointers.current.size === 2) {
        const pts = [...pinchPointers.current.values()];
        pinchStart.current = { dist: Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)), zoom };
      }
    }
  };

  const toggleZoom = () => setZoom((z) => (z === 1 ? TAP_ZOOM : 1));

  const handleHit = 'pointer-events-auto absolute flex h-9 w-9 items-center justify-center';
  const handleDot = 'h-3.5 w-3.5 rounded-sm border-2 border-zinc-900 bg-white shadow-xs';

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-1 touch-none select-none flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-stone-100 via-stone-50 to-stone-100 pt-12 ${
        compact ? 'min-h-0 pb-[var(--sheet-h)]' : 'min-h-[480px] pb-28'
      }`}
      style={compact ? ({ '--sheet-h': '50dvh' } as React.CSSProperties) : undefined}
      onPointerDown={onContainerPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Top Floating Controls: Undo/Redo & Zoom */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center divide-x divide-zinc-200 rounded-full border border-zinc-200/80 bg-white/95 px-1 py-1 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo"
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 active:scale-90 transition disabled:opacity-30"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo"
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 active:scale-90 transition disabled:opacity-30"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-zinc-200/80 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={toggleZoom}
            aria-label="Toggle zoom"
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
          transition: pinchStart.current ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`relative aspect-square w-full shrink-0 touch-none flex items-center justify-center max-h-[60vh] ${
          compact ? 'max-w-[min(420px,calc(50dvh-6.5rem))]' : 'max-w-[420px]'
        }`}
      >
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

        <div className="absolute inset-0 pointer-events-none">
          {layers
            .filter((l) => l.visible)
            .map((l) => {
              const isSelected = selectedIds.includes(l.id);
              const flipX = l.flipX ? -1 : 1;
              const flipY = l.flipY ? -1 : 1;

              return (
                <div
                  key={l.id}
                  style={{
                    position: 'absolute',
                    left: `${l.x * 100}%`,
                    top: `${l.y * 100}%`,
                    transform: `translate(-50%, -50%) rotate(${l.rotation || 0}deg) scale(${flipX}, ${flipY})`,
                    opacity: l.opacity ?? 1,
                  }}
                  data-layer-id={l.id}
                  className="pointer-events-auto cursor-move select-none"
                  onPointerDown={(e) => onLayerPointerDown(e, l)}
                >
                  {l.type === 'image' ? (
                    <div
                      data-layer-content
                      style={{ width: `${l.scale * stageW}px`, aspectRatio: l.aspect || 1 }}
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
                      data-layer-content
                      style={{
                        fontFamily: l.fontFamily,
                        fontSize: `${l.scale * TEXT_FONT_FRACTION * stageW}px`,
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

                  {isSelected && (
                    <div
                      className="absolute inset-0 -m-1 border-2 border-white shadow-xs rounded-sm pointer-events-none"
                      style={{ outline: '1.5px dashed rgba(0, 0, 0, 0.7)', outlineOffset: '0px' }}
                    >
                      {/* Rotation handle: 36px touch target around a 24px button */}
                      <div
                        onPointerDown={(e) => beginDrag(e, l, 'rotate')}
                        className={`${handleHit} -top-[42px] left-1/2 -translate-x-1/2 cursor-grab`}
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 shadow-md">
                          <RotateCw className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-3 w-0.5 bg-white shadow-xs" />

                      {/* Corner scale handles: 36px touch targets around 14px squares */}
                      <div onPointerDown={(e) => beginDrag(e, l, 'scale')} className={`${handleHit} -top-[17px] -left-[17px] cursor-nwse-resize`}>
                        <div className={handleDot} />
                      </div>
                      <div onPointerDown={(e) => beginDrag(e, l, 'scale')} className={`${handleHit} -top-[17px] -right-[17px] cursor-nesw-resize`}>
                        <div className={handleDot} />
                      </div>
                      <div onPointerDown={(e) => beginDrag(e, l, 'scale')} className={`${handleHit} -bottom-[17px] -left-[17px] cursor-nesw-resize`}>
                        <div className={handleDot} />
                      </div>
                      <div onPointerDown={(e) => beginDrag(e, l, 'scale')} className={`${handleHit} -bottom-[17px] -right-[17px] cursor-nwse-resize`}>
                        <div className={handleDot} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Smart guides */}
        {guides.map((g) => (
          <div
            key={`${g.axis}-${g.position}`}
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={
              g.axis === 'x'
                ? { left: `${g.position * 100}%`, top: 0, bottom: 0, width: 1, background: '#000', boxShadow: '0 0 0 0.5px rgba(255,255,255,.85)' }
                : { top: `${g.position * 100}%`, left: 0, right: 0, height: 1, background: '#000', boxShadow: '0 0 0 0.5px rgba(255,255,255,.85)' }
            }
          />
        ))}
      </div>

      {/* Bottom Floating Controls: view switcher */}
      {!compact && views.length >= 2 && (
        <div className="absolute bottom-3 left-0 right-0 z-20 flex flex-col items-center gap-2.5 pointer-events-none">
          <div className="pointer-events-auto flex rounded-full bg-white/95 p-1 border border-zinc-200 shadow-md backdrop-blur-md">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectView(v.id)}
                className={`rounded-full px-5 py-2 text-xs font-bold transition active:scale-95 ${
                  v.id === activeViewId ? 'bg-black text-white shadow-xs' : 'text-zinc-700 hover:text-black'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/95 p-1.5 shadow-md backdrop-blur-md">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectView(v.id)}
                aria-label={`Show ${v.label}`}
                className={`relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 transition active:scale-95 ${
                  v.id === activeViewId ? 'border-black shadow-xs' : 'border-zinc-200 opacity-60 hover:opacity-100'
                }`}
              >
                {v.image ? (
                  <img src={v.image} alt={v.label} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-zinc-600">{v.label.slice(0, 2)}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
