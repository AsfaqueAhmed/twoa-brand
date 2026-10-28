'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Save, ShoppingBag } from 'lucide-react';
import type { ParentProduct } from '@/shared/domain/types';
import type { ParentCardData } from '../../domain/cards';
import { type AlignEdge, type Layer } from '../../domain/layers';
import { DESIGN_STORAGE_KEY, type StudioDesign, serializeDesign, validateArtworkFile } from '../../domain/design';
import { HANDOFF_KEY, resolveStudioTarget } from '../../domain/studioTarget';
import { buildViews } from '../../domain/views';
import { fileToDataUrl } from '../../application/imageUpload';
import { useStudioState } from '../../application/useStudioState';
import Canvas from './Canvas';
import StudioToolbar from './StudioToolbar';
import ToolRail, { type ToolTab } from './ToolRail';
import DesignPanel from './DesignPanel';
import ImagesPanel from './ImagesPanel';
import TextPanel from './TextPanel';
import LayersList from './LayersList';
import ProductPanel from './ProductPanel';
import PositionScalePanel from './PositionScalePanel';

type Props = {
  parent: ParentProduct;
  card: ParentCardData;
  initialSize: string;
  initialColor?: string;
  initialLayersByView: Record<string, Layer[]>;
  refreshParents: () => Promise<ParentProduct[]>;
};

type Status = { kind: 'ok' | 'error'; text: string } | null;

const SECTION_TITLE = 'mb-3 text-[11px] font-bold uppercase tracking-widest text-black';
const TEXT_INPUT_TYPES = ['text', 'search', 'number', 'email', 'url', 'tel', 'password'];
const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  ((t instanceof HTMLInputElement && TEXT_INPUT_TYPES.includes(t.type)) ||
    t.tagName === 'TEXTAREA' ||
    t.tagName === 'SELECT' ||
    t.isContentEditable);

export default function StudioEditor({ parent, card, initialSize, initialColor, initialLayersByView, refreshParents }: Props) {
  const [tool, setTool] = useState<ToolTab>('design');
  const [size, setSize] = useState(initialSize);
  const [colorName, setColorName] = useState<string | undefined>(
    initialColor && card.colors.some((c) => c.name === initialColor) ? initialColor : card.colors[0]?.name,
  );
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<{ w: number; h: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const color = card.colors.find((c) => c.name === colorName);
  const views = useMemo(() => buildViews(parent, color), [parent, color]);
  const [activeViewId, setActiveViewId] = useState('view-0');
  const view = views.find((v) => v.id === activeViewId) ?? views[0];
  const studio = useStudioState(initialLayersByView, view?.id ?? 'view-0');
  useEffect(() => setSelectedSize(null), [view?.id]);
  const sizes = parent.sizeOrder.filter((s) => (parent.stockBySize[s] ?? 0) > 0);
  const selectedText = studio.selected?.type === 'text' ? studio.selected : null;

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        try {
          const problem = validateArtworkFile(file);
          if (problem) {
            setUploadError(problem);
            continue;
          }
          const { src, aspect } = await fileToDataUrl(file);
          studio.addImage(studio.rememberAsset({ name: file.name, src, aspect }));
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : 'Could not read that image.');
        }
      }
    } finally {
      setUploading(false);
    }
  };

  // Dropping a file outside the drop zone must not make the browser navigate to it.
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;
  useEffect(() => {
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types?.includes('Files');
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      const handled = e.defaultPrevented; // the drop zone already took it
      e.preventDefault();
      if (!handled) void onFilesRef.current(e.dataTransfer?.files ?? null);
    };
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  const toggleFullscreen = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.()?.catch(() => {});
  };
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  useEffect(() => {
    setFullscreenSupported(!!document.fullscreenEnabled);
  }, []);
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Delete removes the selected layer; Ctrl/Cmd+Z undo, +Shift redo. Ignored while typing in a field.
  const studioRef = useRef(studio);
  studioRef.current = studio;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const s = studioRef.current;
      if ((e.key === 'Delete' || e.key === 'Backspace') && s.selectedId) {
        e.preventDefault();
        s.remove(s.selectedId);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const fresh = await refreshParents();
      if (!resolveStudioTarget(fresh, { parentProductId: parent.id, size })) {
        setStatus({ kind: 'error', text: 'This tee is no longer available in that size. Please choose another size.' });
        return;
      }
      const design: StudioDesign = { parentProductId: parent.id, size, colorName, layersByView: Object.fromEntries(Object.entries(studio.layersByView).filter(([, ls]) => ls.length > 0)),
      };
      try {
        sessionStorage.setItem(DESIGN_STORAGE_KEY, serializeDesign(design));
        sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ parentProductId: parent.id, size }));
      } catch {
        setStatus({ kind: 'error', text: 'Your design is too large to save in this browser session. Try smaller images.' });
        return;
      }
      setStatus({ kind: 'ok', text: 'Design saved for this session.' });
    } catch {
      setStatus({ kind: 'error', text: 'Could not check stock. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const layersList = (
    <LayersList
      layers={studio.layers}
      selectedId={studio.selectedId}
      onSelect={studio.select}
      onToggle={studio.toggle}
      onRemove={studio.remove}
      onMove={studio.move}
      onReorder={studio.reorder}
    />
  );

  return (
    <div ref={rootRef} className="overflow-auto bg-white">
      <div className="mx-auto grid max-w-[1500px] border-b border-[#EEEEEE] lg:grid-cols-[88px_300px_minmax(0,1fr)_360px]">
        <ToolRail active={tool} onChange={setTool} className="order-2 lg:order-1" />

        <aside className="order-3 border-b border-[#EEEEEE] p-5 lg:order-2 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          {tool === 'design' && <DesignPanel onFiles={onFiles} busy={uploading} error={uploadError} />}
          {tool === 'images' && <ImagesPanel assets={studio.assets} onAdd={studio.addImage} />}
          {tool === 'text' && (
            <TextPanel selected={selectedText} onAdd={studio.addText} onLiveChange={studio.patchLive} onSettle={studio.settleGesture} />
          )}
          {tool === 'layers' && (
            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-black">Layers</h2>
              {layersList}
            </div>
          )}
        </aside>

        <section className="order-1 flex min-w-0 flex-col gap-4 bg-[#F5F5F5] p-4 sm:p-6 lg:order-3">
          <StudioToolbar
            canUndo={studio.canUndo}
            canRedo={studio.canRedo}
            onUndo={studio.undo}
            onRedo={studio.redo}
            views={views}
            activeView={view?.id ?? 'view-0'}
            onView={setActiveViewId}
            zoom={zoom}
            onZoom={setZoom}
            fullscreen={fullscreen}
            onFullscreen={toggleFullscreen}
            fullscreenSupported={fullscreenSupported}
          />
          <div className="overflow-auto py-4">
            <Canvas
              baseImage={view?.image}
              baseAlt={`${parent.name} ${view?.label ?? ''}`.trim()}
              layers={studio.layers}
              selectedId={studio.selectedId}
              zoom={zoom}
              onSelect={studio.select}
              onLiveChange={studio.patchLive}
              onSettle={studio.settleGesture}
              onSelectedSize={setSelectedSize}
            />
          </div>
          <div className="flex justify-center gap-3">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-label={`${v.label} view`}
                aria-pressed={v.id === view?.id}
                onClick={() => setActiveViewId(v.id)}
                className={`h-16 w-16 overflow-hidden rounded-lg border-2 bg-white ${v.id === view?.id ? 'border-black' : 'border-[#EEEEEE]'}`}
              >
                <img src={v.image} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>

        <aside className="order-4 space-y-6 border-t border-[#EEEEEE] p-5 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-l lg:border-t-0">
          <ProductPanel
            card={card}
            image={view?.image}
            sizes={sizes}
            size={size}
            colorName={colorName}
            onColor={setColorName}
            onSize={(s) => {
              setSize(s);
              setStatus(null);
            }}
          />
          <div>
            <h2 className={SECTION_TITLE}>Design Layers</h2>
            {layersList}
          </div>
          <PositionScalePanel
            layer={studio.selected}
            size={selectedSize}
            onAlign={(edge: AlignEdge) => studio.selectedId && selectedSize && studio.align(studio.selectedId, selectedSize, edge)}
            onFlip={(axis) => studio.selectedId && studio.flip(studio.selectedId, axis)}
            onScaleLive={(scale) => studio.selectedId && studio.patchLive(studio.selectedId, { scale })}
            onSettle={studio.settleGesture}
          />

          {status && (
            <p role={status.kind === 'error' ? 'alert' : 'status'} className={`rounded-lg px-4 py-3 text-xs ${status.kind === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>
              {status.text}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled
              title="Coming soon"
              className="flex items-center justify-center gap-2 rounded-lg bg-[#EEEEEE] px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9A9A9A]"
            >
              <ShoppingBag className="h-4 w-4" />
              Add to Cart
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#333333] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Design'}
            </button>
          </div>
          <p className="text-center text-[10px] text-[#717171]">Add to Cart and pricing are coming soon.</p>
        </aside>
      </div>
    </div>
  );
}
