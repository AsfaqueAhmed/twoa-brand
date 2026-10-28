'use client';

import { useEffect, useRef, useState } from 'react';
import { type Layer, type LayerPatch, TEXT_FONT_FRACTION } from '../../domain/layers';

type Props = {
  baseImage?: string;
  baseAlt: string;
  layers: Layer[];
  selectedId: string | null;
  zoom: number;
  onSelect: (id: string | null) => void;
  onLiveChange: (id: string, patch: LayerPatch) => void;
  onSettle: () => void;
  onSelectedSize: (size: { w: number; h: number } | null) => void;
};

type Drag =
  | { kind: 'move'; id: string; startNx: number; startNy: number; x: number; y: number }
  | { kind: 'scale'; id: string; cx: number; cy: number; startDist: number; scale: number }
  | { kind: 'rotate'; id: string; cx: number; cy: number; startAngle: number; rotation: number };

const BASE_WIDTH_PX = 520;
const CORNER = 'absolute h-3 w-3 rounded-sm border border-black bg-white';
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export default function Canvas({ baseImage, baseAlt, layers, selectedId, zoom, onSelect, onLiveChange, onSettle, onSelectedSize }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const lastSize = useRef('');
  const [canvasW, setCanvasW] = useState(0);

  // Font sizes depend on the canvas width, so track it.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setCanvasW(el.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Report the selected layer's rotated bounding box (as canvas fractions) for the align controls.
  useEffect(() => {
    const el = boxRef.current;
    if (!selectedId || !el) {
      if (lastSize.current !== '') {
        lastSize.current = '';
        onSelectedSize(null);
      }
      return;
    }
    const content = el.querySelector<HTMLElement>(`[data-layer-id="${CSS.escape(selectedId)}"] [data-layer-content]`);
    const layer = layers.find((l) => l.id === selectedId);
    if (!content || !layer || !el.offsetWidth || !el.offsetHeight) return;
    // Bounding box of the rotated layer, so aligning a rotated layer puts its visible edge on the canvas edge.
    const rad = (layer.rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const w = (content.offsetWidth * cos + content.offsetHeight * sin) / el.offsetWidth;
    const h = (content.offsetWidth * sin + content.offsetHeight * cos) / el.offsetHeight;
    const key = `${w.toFixed(4)}:${h.toFixed(4)}`;
    if (key !== lastSize.current) {
      lastSize.current = key;
      onSelectedSize({ w, h });
    }
  });

  const begin = (e: React.PointerEvent, layer: Layer, kind: Drag['kind']) => {
    e.stopPropagation();
    const box = boxRef.current;
    if (!box) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(layer.id);
    const r = box.getBoundingClientRect();
    const cx = r.left + layer.x * r.width;
    const cy = r.top + layer.y * r.height;
    if (kind === 'move') {
      drag.current = { kind, id: layer.id, startNx: (e.clientX - r.left) / r.width, startNy: (e.clientY - r.top) / r.height, x: layer.x, y: layer.y };
    } else if (kind === 'scale') {
      drag.current = { kind, id: layer.id, cx, cy, startDist: Math.max(1, Math.hypot(e.clientX - cx, e.clientY - cy)), scale: layer.scale };
    } else {
      drag.current = { kind, id: layer.id, cx, cy, startAngle: toDeg(Math.atan2(e.clientY - cy, e.clientX - cx)), rotation: layer.rotation };
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box) return;
    if (d.kind === 'move') {
      const r = box.getBoundingClientRect();
      onLiveChange(d.id, {
        x: d.x + ((e.clientX - r.left) / r.width - d.startNx),
        y: d.y + ((e.clientY - r.top) / r.height - d.startNy),
      });
    } else if (d.kind === 'scale') {
      onLiveChange(d.id, { scale: (d.scale * Math.hypot(e.clientX - d.cx, e.clientY - d.cy)) / d.startDist });
    } else {
      onLiveChange(d.id, { rotation: d.rotation + (toDeg(Math.atan2(e.clientY - d.cy, e.clientX - d.cx)) - d.startAngle) });
    }
  };

  const end = () => {
    if (drag.current) {
      drag.current = null;
      onSettle();
    }
  };

  return (
    <div
      ref={boxRef}
      className="relative mx-auto select-none"
      style={{ width: `${Math.round(BASE_WIDTH_PX * zoom)}px`, maxWidth: zoom <= 1 ? '100%' : 'none' }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
      onPointerMove={onMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {baseImage ? (
        <img src={baseImage} alt={baseAlt} draggable={false} className="pointer-events-none block h-auto w-full select-none" />
      ) : (
        <div className="aspect-square w-full bg-[#F5F5F5]" />
      )}

      {layers
        .filter((l) => l.visible)
        .map((layer) => {
          const isSelected = layer.id === selectedId;
          return (
            <div
              key={layer.id}
              data-layer-id={layer.id}
              onPointerDown={(e) => begin(e, layer, 'move')}
              className={`absolute cursor-move ${isSelected ? 'outline-dashed outline-1 outline-black' : ''}`}
              style={{
                left: `${layer.x * 100}%`,
                top: `${layer.y * 100}%`,
                width: layer.type === 'image' ? `${layer.scale * 100}%` : undefined,
                transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                touchAction: 'none',
              }}
            >
              <div
                data-layer-content
                style={{
                  transform: `scale(${layer.flipX ? -1 : 1}, ${layer.flipY ? -1 : 1})`,
                  ...(layer.type === 'text'
                    ? {
                        fontSize: `${layer.scale * TEXT_FONT_FRACTION * canvasW}px`,
                        fontFamily: layer.fontFamily,
                        color: layer.color,
                        whiteSpace: 'nowrap' as const,
                        lineHeight: 1.1,
                      }
                    : {}),
                }}
              >
                {layer.type === 'image' ? (
                  <img src={layer.src} alt={layer.name} draggable={false} className="pointer-events-none block h-auto w-full select-none" />
                ) : (
                  layer.text
                )}
              </div>

              {isSelected && (
                <>
                  <span aria-hidden="true" className={`${CORNER} -left-1.5 -top-1.5 cursor-nwse-resize`} onPointerDown={(e) => begin(e, layer, 'scale')} />
                  <span aria-hidden="true" className={`${CORNER} -right-1.5 -top-1.5 cursor-nesw-resize`} onPointerDown={(e) => begin(e, layer, 'scale')} />
                  <span aria-hidden="true" className={`${CORNER} -bottom-1.5 -left-1.5 cursor-nesw-resize`} onPointerDown={(e) => begin(e, layer, 'scale')} />
                  <span aria-hidden="true" className={`${CORNER} -bottom-1.5 -right-1.5 cursor-nwse-resize`} onPointerDown={(e) => begin(e, layer, 'scale')} />
                  <span aria-hidden="true" className="absolute -top-6 left-1/2 h-5 w-px -translate-x-1/2 bg-black" />
                  <span
                    aria-hidden="true"
                    className="absolute -top-8 left-1/2 h-3.5 w-3.5 -translate-x-1/2 cursor-grab rounded-full border border-black bg-white"
                    onPointerDown={(e) => begin(e, layer, 'rotate')}
                  />
                </>
              )}
            </div>
          );
        })}
    </div>
  );
}
