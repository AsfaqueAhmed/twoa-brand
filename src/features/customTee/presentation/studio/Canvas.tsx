'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { type Layer, type LayerPatch, TEXT_FONT_FRACTION, normalizeRotation, scaleToPercent } from '../../domain/layers';
import { expandToGroups, isSingleUnit } from '../../domain/grouping';
import { type Box, type CanvasPx, type Size, boxCenter, boxesIntersect, layerBox, rotateLayersAround, scaleLayersAround, unionBox } from '../../domain/geometry';
import { type Guide, snapAngle, snapBox } from '../../domain/snapping';
import { type Viewport, clampZoom, fitViewport, panBy, zoomAt } from '../../domain/viewport';

export type CanvasHandle = { zoomBy: (factor: number) => void; setZoom: (zoom: number) => void; fit: () => void };

type Props = {
  baseImage?: string;
  baseAlt: string;
  layers: Layer[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onLiveChange: (patches: Record<string, LayerPatch>) => void;
  onSettle: () => void;
  onCommitText: (id: string, text: string) => void;
  onMeasure: (m: { stage: CanvasPx; sizes: Record<string, Size> }) => void;
  onZoomChange: (zoom: number) => void;
};

type Drag =
  | { kind: 'move'; ids: string[]; startNx: number; startNy: number; start: Record<string, { x: number; y: number }>; startBox: Box; others: Box[] }
  | { kind: 'scale'; ids: string[]; anchor: { x: number; y: number }; cx: number; cy: number; startDist: number; startLayers: Layer[]; single: boolean }
  | { kind: 'rotate'; ids: string[]; anchor: { x: number; y: number }; cx: number; cy: number; startAngle: number; startLayers: Layer[]; single: boolean }
  | { kind: 'pan'; startX: number; startY: number; panX: number; panY: number }
  | { kind: 'marquee'; startNx: number; startNy: number; additive: boolean; base: string[] };

const BASE_WIDTH_PX = 520;
const SNAP_PX = 6;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const hasModifier = (e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => e.shiftKey || e.metaKey || e.ctrlKey;

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(
  { baseImage, baseAlt, layers, selectedIds, onSelect, onLiveChange, onSettle, onCommitText, onMeasure, onZoomChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const lastMeasure = useRef('');

  const [vp, setVp] = useState<Viewport>({ zoom: 1, panX: 0, panY: 0 });
  const vpRef = useRef(vp);
  vpRef.current = vp;
  const [stagePx, setStagePx] = useState<CanvasPx>({ w: BASE_WIDTH_PX, h: BASE_WIDTH_PX });
  const [sizes, setSizes] = useState<Record<string, Size>>({});
  const [guides, setGuides] = useState<Guide[]>([]);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [readout, setReadout] = useState<{ x: number; y: number; text: string } | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);

  const applyViewport = (next: Viewport) => {
    setVp(next);
    onZoomChange(next.zoom);
  };

  const fit = () => {
    const c = containerRef.current;
    const s = stageRef.current;
    if (!c || !s || !s.offsetWidth || !s.offsetHeight) return;
    applyViewport(fitViewport({ w: c.clientWidth, h: c.clientHeight }, { w: s.offsetWidth, h: s.offsetHeight }));
  };

  const zoomAbout = (factor: number | null, absolute: number | null, cursor?: { x: number; y: number }) => {
    const c = containerRef.current;
    if (!c) return;
    const at = cursor ?? { x: c.clientWidth / 2, y: c.clientHeight / 2 };
    const current = vpRef.current;
    applyViewport(zoomAt(current, absolute ?? clampZoom(current.zoom * (factor ?? 1)), at));
  };

  useImperativeHandle(ref, () => ({ zoomBy: (f) => zoomAbout(f, null), setZoom: (z) => zoomAbout(null, z), fit }));

  // Track the stage size (font sizes depend on its width).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStagePx({ w: el.offsetWidth, h: el.offsetHeight });
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
    const key = `${stage.offsetWidth}x${stage.offsetHeight}|` + Object.entries(next).map(([id, s]) => `${id}:${s.w.toFixed(4)},${s.h.toFixed(4)}`).join(';');
    if (key !== lastMeasure.current) {
      lastMeasure.current = key;
      setSizes(next);
      onMeasure({ stage: { w: stage.offsetWidth, h: stage.offsetHeight }, sizes: next });
    }
  });

  // Wheel pans; Ctrl/Cmd+wheel (and trackpad pinch) zooms about the cursor. Needs a non-passive listener.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const current = vpRef.current;
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        applyViewport(zoomAt(current, current.zoom * Math.exp(-e.deltaY * 0.01), { x: e.clientX - rect.left, y: e.clientY - rect.top }));
      } else {
        applyViewport(panBy(current, -e.deltaX, -e.deltaY));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Space + drag pans.
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !typing(e.target)) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false);
    };
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
    };
  }, []);

  const stageRect = () => stageRef.current!.getBoundingClientRect();
  const norm = (e: { clientX: number; clientY: number }) => {
    const r = stageRect();
    return { nx: (e.clientX - r.left) / r.width, ny: (e.clientY - r.top) / r.height };
  };
  const boxFor = (l: Layer): Box | null => (sizes[l.id] ? layerBox(l, sizes[l.id], stagePx) : null);
  const boxesOf = (ls: Layer[]): Box[] => ls.map(boxFor).filter((b): b is Box => b !== null);

  const startMove = (e: React.PointerEvent, ids: string[]) => {
    const picked = layers.filter((l) => ids.includes(l.id));
    const startBox = unionBox(boxesOf(picked));
    if (!startBox) return;
    const { nx, ny } = norm(e);
    drag.current = {
      kind: 'move',
      ids,
      startNx: nx,
      startNy: ny,
      start: Object.fromEntries(picked.map((l) => [l.id, { x: l.x, y: l.y }])),
      startBox,
      others: boxesOf(layers.filter((l) => l.visible && !ids.includes(l.id))),
    };
  };

  const onLayerPointerDown = (e: React.PointerEvent, layer: Layer) => {
    e.stopPropagation();
    if (editingId === layer.id) return; // let the text field handle it
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const unit = expandToGroups(layers, [layer.id]);
    let ids: string[];
    if (hasModifier(e)) {
      const allIn = unit.every((id) => selectedIds.includes(id));
      ids = allIn ? selectedIds.filter((id) => !unit.includes(id)) : [...new Set([...selectedIds, ...unit])];
    } else if (selectedIds.includes(layer.id)) {
      ids = selectedIds; // keep the selection and move all of it
    } else {
      ids = unit;
    }
    onSelect(ids);
    if (ids.length > 0) startMove(e, ids);
  };

  const onHandlePointerDown = (e: React.PointerEvent, kind: 'scale' | 'rotate') => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const picked = layers.filter((l) => selectedIds.includes(l.id));
    const union = unionBox(boxesOf(picked));
    if (!union || picked.length === 0) return;
    const single = picked.length === 1;
    const anchor = single ? { x: picked[0].x, y: picked[0].y } : boxCenter(union);
    const r = stageRect();
    const cx = r.left + anchor.x * r.width;
    const cy = r.top + anchor.y * r.height;
    if (kind === 'scale') {
      drag.current = { kind, ids: selectedIds, anchor, cx, cy, startDist: Math.max(1, Math.hypot(e.clientX - cx, e.clientY - cy)), startLayers: picked, single };
    } else {
      drag.current = { kind, ids: selectedIds, anchor, cx, cy, startAngle: toDeg(Math.atan2(e.clientY - cy, e.clientX - cx)), startLayers: picked, single };
    }
  };

  const onContainerPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).hasAttribute('data-stage-bg')) return;
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, panX: vp.panX, panY: vp.panY };
      return;
    }
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { nx, ny } = norm(e);
    const additive = hasModifier(e);
    drag.current = { kind: 'marquee', startNx: nx, startNy: ny, additive, base: additive ? selectedIds : [] };
    if (!additive) onSelect([]);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'pan') {
      applyViewport({ ...vpRef.current, panX: d.panX + (e.clientX - d.startX), panY: d.panY + (e.clientY - d.startY) });
      return;
    }
    const r = stageRect();
    if (d.kind === 'marquee') {
      const { nx, ny } = norm(e);
      const box: Box = { left: Math.min(d.startNx, nx), top: Math.min(d.startNy, ny), right: Math.max(d.startNx, nx), bottom: Math.max(d.startNy, ny) };
      setMarquee(box);
      const hit = layers.filter((l) => l.visible && boxFor(l) && boxesIntersect(boxFor(l)!, box)).map((l) => l.id);
      onSelect([...new Set([...d.base, ...expandToGroups(layers, hit)])]);
      return;
    }
    if (d.kind === 'move') {
      const { nx, ny } = norm(e);
      let dx = nx - d.startNx;
      let dy = ny - d.startNy;
      let found: Guide[] = [];
      if (!e.altKey) {
        const moved: Box = { left: d.startBox.left + dx, right: d.startBox.right + dx, top: d.startBox.top + dy, bottom: d.startBox.bottom + dy };
        const snap = snapBox(moved, d.others, { x: SNAP_PX / r.width, y: SNAP_PX / r.height });
        dx += snap.dx;
        dy += snap.dy;
        found = snap.guides;
      }
      setGuides(found);
      onLiveChange(Object.fromEntries(d.ids.map((id) => [id, { x: d.start[id].x + dx, y: d.start[id].y + dy }])));
      return;
    }
    if (d.kind === 'scale') {
      const factor = Math.max(0.05, Math.hypot(e.clientX - d.cx, e.clientY - d.cy) / d.startDist);
      const next = scaleLayersAround(d.startLayers, d.ids, factor, d.anchor, stagePx);
      onLiveChange(Object.fromEntries(next.map((l) => [l.id, { x: l.x, y: l.y, scale: l.scale }])));
      const text = d.single ? `${scaleToPercent(next[0].scale)}%` : `${Math.round(factor * 100)}%`;
      const cr = containerRef.current!.getBoundingClientRect();
      setReadout({ x: e.clientX - cr.left + 14, y: e.clientY - cr.top + 14, text });
      return;
    }
    // rotate
    const raw = toDeg(Math.atan2(e.clientY - d.cy, e.clientX - d.cx)) - d.startAngle;
    const base = d.single ? d.startLayers[0].rotation : 0;
    const snapped = snapAngle(normalizeRotation(base + raw), 15, 4, e.shiftKey);
    const delta = snapped - base;
    const next = rotateLayersAround(d.startLayers, d.ids, delta, d.anchor, stagePx);
    onLiveChange(Object.fromEntries(next.map((l) => [l.id, { x: l.x, y: l.y, rotation: l.rotation }])));
    const cr = containerRef.current!.getBoundingClientRect();
    setReadout({ x: e.clientX - cr.left + 14, y: e.clientY - cr.top + 14, text: `${Math.round(normalizeRotation(base + delta))}°` });
  };

  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    setGuides([]);
    setMarquee(null);
    setReadout(null);
    if (d && d.kind !== 'pan' && d.kind !== 'marquee') onSettle();
  };

  // ----- selection chrome -----
  const selectedLayers = layers.filter((l) => selectedIds.includes(l.id) && l.visible);
  const showHandles = selectedLayers.length > 0 && isSingleUnit(layers, selectedIds) && editingId === null;
  const single = selectedLayers.length === 1 ? selectedLayers[0] : null;
  const selectionBox = selectedLayers.length > 1 ? unionBox(boxesOf(selectedLayers)) : null;
  const px = (n: number) => n / vp.zoom; // keep chrome a constant on-screen size at any zoom
  const handle = (extra: React.CSSProperties, cursor: string, kind: 'scale' | 'rotate') => (
    <span
      aria-hidden="true"
      onPointerDown={(e) => onHandlePointerDown(e, kind)}
      style={{ position: 'absolute', width: px(12), height: px(12), background: '#fff', border: `${px(1.5)}px solid #000`, borderRadius: kind === 'rotate' ? '50%' : px(2), cursor, touchAction: 'none', pointerEvents: 'auto', ...extra }}
    />
  );

  return (
    <div
      ref={containerRef}
      data-canvas-container
      onPointerDown={onContainerPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="relative h-[calc(100vh-15rem)] min-h-[420px] w-full overflow-hidden"
      style={{ cursor: spaceDown ? 'grab' : 'default', touchAction: 'none' }}
    >
      <div
        ref={stageRef}
        data-stage-bg
        className="absolute left-0 top-0 select-none"
        style={{ width: BASE_WIDTH_PX, transform: `translate(${vp.panX}px, ${vp.panY}px) scale(${vp.zoom})`, transformOrigin: '0 0' }}
      >
        {baseImage ? (
          <img
            src={baseImage}
            alt={baseAlt}
            draggable={false}
            onLoad={fit}
            data-stage-bg
            className="block h-auto w-full select-none"
          />
        ) : (
          <div data-stage-bg className="aspect-square w-full bg-[#EEEEEE]" />
        )}

        {layers
          .filter((l) => l.visible)
          .map((layer) => {
            const isSelected = selectedIds.includes(layer.id);
            const isEditing = editingId === layer.id && layer.type === 'text';
            return (
              <div
                key={layer.id}
                data-layer-id={layer.id}
                onPointerDown={(e) => onLayerPointerDown(e, layer)}
                onDoubleClick={() => {
                  onSelect([layer.id]);
                  if (layer.type === 'text') setEditingId(layer.id);
                }}
                onPointerEnter={() => setHoverId(layer.id)}
                onPointerLeave={() => setHoverId((h) => (h === layer.id ? null : h))}
                className="absolute"
                style={{
                  left: `${layer.x * 100}%`,
                  top: `${layer.y * 100}%`,
                  width: layer.type === 'image' ? `${layer.scale * 100}%` : undefined,
                  transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                  cursor: isEditing ? 'text' : 'move',
                  touchAction: 'none',
                  outline: isSelected ? `${px(1.5)}px ${showHandles && single ? 'dashed' : 'solid'} #000` : hoverId === layer.id && !drag.current ? `${px(1)}px solid rgba(0,0,0,.45)` : 'none',
                }}
              >
                <div
                  data-layer-content
                  style={{
                    transform: `scale(${layer.flipX ? -1 : 1}, ${layer.flipY ? -1 : 1})`,
                    opacity: layer.opacity,
                    ...(layer.type === 'text'
                      ? {
                          fontSize: `${layer.scale * TEXT_FONT_FRACTION * stagePx.w}px`,
                          fontFamily: layer.fontFamily,
                          fontWeight: layer.bold ? 700 : 400,
                          fontStyle: layer.italic ? 'italic' : 'normal',
                          textAlign: layer.align,
                          letterSpacing: `${layer.letterSpacing}em`,
                          color: layer.color,
                          whiteSpace: 'pre' as const,
                          lineHeight: 1.15,
                        }
                      : {}),
                  }}
                >
                  {layer.type === 'image' ? (
                    <img src={layer.src} alt={layer.name} draggable={false} className="pointer-events-none block h-auto w-full select-none" />
                  ) : isEditing ? (
                    <TextEditor
                      initial={layer.text}
                      width={Math.max(40, (sizes[layer.id]?.w ?? 0.2) * stagePx.w + 24)}
                      onDone={(value, commit) => {
                        setEditingId(null);
                        if (commit) onCommitText(layer.id, value);
                      }}
                    />
                  ) : (
                    layer.text
                  )}
                </div>

                {isSelected && showHandles && single && single.id === layer.id && (
                  <>
                    {handle({ left: 0, top: 0, transform: 'translate(-50%,-50%)' }, 'nwse-resize', 'scale')}
                    {handle({ right: 0, top: 0, transform: 'translate(50%,-50%)' }, 'nesw-resize', 'scale')}
                    {handle({ left: 0, bottom: 0, transform: 'translate(-50%,50%)' }, 'nesw-resize', 'scale')}
                    {handle({ right: 0, bottom: 0, transform: 'translate(50%,50%)' }, 'nwse-resize', 'scale')}
                    <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: px(-22), width: px(1.5), height: px(18), background: '#000', transform: 'translateX(-50%)' }} />
                    {handle({ left: '50%', top: px(-34), transform: 'translateX(-50%)' }, 'grab', 'rotate')}
                  </>
                )}
              </div>
            );
          })}

        {/* Group / multi-selection bounding box (with handles when the selection is one whole group). */}
        {selectionBox && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: `${selectionBox.left * 100}%`,
              top: `${selectionBox.top * 100}%`,
              width: `${(selectionBox.right - selectionBox.left) * 100}%`,
              height: `${(selectionBox.bottom - selectionBox.top) * 100}%`,
              outline: `${px(1.5)}px dashed #000`,
            }}
          >
            {showHandles && (
              <div className="pointer-events-none absolute inset-0">
                {handle({ left: 0, top: 0, transform: 'translate(-50%,-50%)' }, 'nwse-resize', 'scale')}
                {handle({ right: 0, top: 0, transform: 'translate(50%,-50%)' }, 'nesw-resize', 'scale')}
                {handle({ left: 0, bottom: 0, transform: 'translate(-50%,50%)' }, 'nesw-resize', 'scale')}
                {handle({ right: 0, bottom: 0, transform: 'translate(50%,50%)' }, 'nwse-resize', 'scale')}
                <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: px(-22), width: px(1.5), height: px(18), background: '#000', transform: 'translateX(-50%)' }} />
                {handle({ left: '50%', top: px(-34), transform: 'translateX(-50%)' }, 'grab', 'rotate')}
              </div>
            )}
          </div>
        )}

        {/* Smart guides */}
        {guides.map((g) => (
          <div
            key={`${g.axis}-${g.position}`}
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={
              g.axis === 'x'
                ? { left: `${g.position * 100}%`, top: 0, bottom: 0, width: px(1), background: '#000', boxShadow: `0 0 0 ${px(0.75)}px rgba(255,255,255,.9)` }
                : { top: `${g.position * 100}%`, left: 0, right: 0, height: px(1), background: '#000', boxShadow: `0 0 0 ${px(0.75)}px rgba(255,255,255,.9)` }
            }
          />
        ))}

        {/* Marquee */}
        {marquee && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: `${marquee.left * 100}%`,
              top: `${marquee.top * 100}%`,
              width: `${(marquee.right - marquee.left) * 100}%`,
              height: `${(marquee.bottom - marquee.top) * 100}%`,
              border: `${px(1)}px dashed #000`,
              background: 'rgba(0,0,0,.06)',
            }}
          />
        )}
      </div>

      {readout && (
        <div className="pointer-events-none absolute rounded-md bg-black px-2 py-1 text-[11px] font-semibold text-white" style={{ left: readout.x, top: readout.y }}>
          {readout.text}
        </div>
      )}
    </div>
  );
});

export default Canvas;

// In-place text editor: a textarea that inherits the layer's font styling. Enter adds a line; blur commits; Escape cancels.
function TextEditor({ initial, width, onDone }: { initial: string; width: number; onDone: (value: string, commit: boolean) => void }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  const finished = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const finish = (commit: boolean) => {
    if (finished.current) return;
    finished.current = true;
    onDone(value, commit && value.trim().length > 0);
  };
  return (
    <textarea
      ref={ref}
      value={value}
      aria-label="Edit text"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation(); // keep studio shortcuts (Delete, arrows, Cmd+Z) out of the editor
        if (e.key === 'Escape') finish(false);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      rows={Math.max(1, value.split('\n').length)}
      style={{
        width,
        font: 'inherit',
        letterSpacing: 'inherit',
        color: 'inherit',
        textAlign: 'inherit',
        lineHeight: 'inherit',
        background: 'rgba(255,255,255,.7)',
        border: 'none',
        outline: 'none',
        resize: 'none',
        overflow: 'hidden',
        whiteSpace: 'pre',
        padding: 0,
        margin: 0,
        display: 'block',
      }}
    />
  );
}
