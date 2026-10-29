'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquareQuote, Save } from 'lucide-react';
import type { ParentProduct } from '@/shared/domain/types';
import type { ParentCardData } from '../../domain/cards';
import { type Layer } from '../../domain/layers';
import { isSingleUnit, selectionUnits } from '../../domain/grouping';
import type { CanvasPx, Size } from '../../domain/geometry';
import { DESIGN_STORAGE_KEY, type StudioDesign, pruneLayersByView, serializeDesign, validateArtworkFile } from '../../domain/design';
import { HANDOFF_KEY, resolveStudioTarget } from '../../domain/studioTarget';
import { buildViews } from '../../domain/views';
import { fileToDataUrl } from '../../application/imageUpload';
import { useStudioState } from '../../application/useStudioState';
import Canvas, { type CanvasHandle } from './Canvas';
import StudioToolbar from './StudioToolbar';
import ToolRail, { type ToolTab } from './ToolRail';
import DesignPanel from './DesignPanel';
import ImagesPanel from './ImagesPanel';
import TextAddPanel from './TextAddPanel';
import TextInspector from './TextInspector';
import SelectionInspector from './SelectionInspector';
import AlignPanel from './AlignPanel';
import LayersList from './LayersList';
import ProductPanel from './ProductPanel';
import QuoteRequestModal from '../QuoteRequestModal';
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

type PanelTab = 'layers' | 'properties';
const TAB_BASE = 'flex-1 rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors';
const SECTION_TITLE = 'mb-3 text-[11px] font-bold uppercase tracking-widest text-black';
const TEXT_INPUT_TYPES = ['text', 'search', 'number', 'email', 'url', 'tel', 'password'];
const isFormControl = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.tagName === 'INPUT' ||
    t.tagName === 'TEXTAREA' ||
    t.tagName === 'SELECT' ||
    t.tagName === 'BUTTON' ||
    t.isContentEditable ||
    t.getAttribute('role') === 'combobox' ||
    t.getAttribute('role') === 'option');
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
  const canvasRef = useRef<CanvasHandle>(null);
  const [zoom, setZoom] = useState(1);
  const [stagePx, setStagePx] = useState<CanvasPx>({ w: 520, h: 520 });
  const [layerSizes, setLayerSizes] = useState<Record<string, Size>>({});
  const stagePxRef = useRef(stagePx);
  stagePxRef.current = stagePx;
  const [fullscreen, setFullscreen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const [panelTab, setPanelTab] = useState<PanelTab>('layers');

  const color = card.colors.find((c) => c.name === colorName);
  const views = useMemo(() => buildViews(parent, color), [parent, color]);
  const [activeViewId, setActiveViewId] = useState('view-0');
  const view = views.find((v) => v.id === activeViewId) ?? views[0];
  const initialPruned = useMemo(() => pruneLayersByView(initialLayersByView, views.map((v) => v.id)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const studio = useStudioState(initialPruned, view?.id ?? 'view-0');
  const sizes = parent.sizeOrder.filter((s) => (parent.stockBySize[s] ?? 0) > 0);
  const selectedText = studio.selected?.type === 'text' ? studio.selected : null;
  const selectedImage = studio.selected?.type === 'image' ? studio.selected : null;
  const units = selectionUnits(studio.layers, studio.selectedIds);
  const singleUnit = isSingleUnit(studio.layers, studio.selectedIds);
  const isGroup = singleUnit && studio.selectedIds.length > 1;

  const hasSelection = studio.selectedIds.length > 0;
  useEffect(() => {
    setPanelTab(hasSelection ? 'properties' : 'layers');
  }, [hasSelection]);

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
  // A selection never carries over to another view.
  const viewId = view?.id;
  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    studioRef.current.select([]);
  }, [viewId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const s = studioRef.current;
      const needsFree = e.key === 'Delete' || e.key === 'Backspace' || e.key.startsWith('Arrow');
      if (needsFree && isFormControl(e.target)) return; // sliders, buttons and selects keep their own keys
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if ((e.key === 'Delete' || e.key === 'Backspace') && s.selectedIds.length > 0) {
        e.preventDefault();
        s.removeSelected();
      } else if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      } else if (mod && key === 'a') {
        e.preventDefault();
        s.selectAll();
      } else if (mod && key === 'g') {
        e.preventDefault();
        if (e.shiftKey) s.ungroup();
        else s.group();
      } else if (e.key === 'Escape') {
        if (document.querySelector('[role=listbox]')) return; // an open Select closes first
        s.select([]);
      } else if (s.selectedIds.length > 0 && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0) / stagePxRef.current.w;
        const dy = (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0) / stagePxRef.current.h;
        s.nudge(s.selectedIds, dx, dy);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const quoteDesign: StudioDesign = {
    parentProductId: parent.id,
    size,
    colorName,
    layersByView: pruneLayersByView(studio.layersByView, views.map((v) => v.id)),
  };
  const hasAnyLayers = Object.values(quoteDesign.layersByView).some((l) => l.length > 0);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const fresh = await refreshParents();
      if (!resolveStudioTarget(fresh, { parentProductId: parent.id, size })) {
        setStatus({ kind: 'error', text: 'This tee is no longer available in that size. Please choose another size.' });
        return;
      }
      const design: StudioDesign = {
        parentProductId: parent.id,
        size,
        colorName,
        layersByView: pruneLayersByView(studio.layersByView, views.map((v) => v.id)),
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

  const layersList = (maxRows?: number) => (
    <LayersList
      maxRows={maxRows}
      layers={studio.layers}
      selectedIds={studio.selectedIds}
      onSelect={studio.select}
      onSetVisible={studio.setVisible}
      onRemove={studio.removeIds}
      onMoveUnit={studio.moveUnit}
      onReorderUnit={studio.reorderUnit}
    />
  );

  return (
    <div ref={rootRef} className="bg-white lg:h-full [&:fullscreen]:overflow-auto">
      <div className="mx-auto grid max-w-[1500px] border-b border-[#EEEEEE] lg:h-full lg:grid-rows-1 lg:grid-cols-[88px_300px_minmax(0,1fr)_360px]">
        <ToolRail active={tool} onChange={setTool} className="order-2 lg:order-1 lg:min-h-0 lg:overflow-hidden" />

        <aside className="order-3 border-b border-[#EEEEEE] p-5 lg:order-2 lg:min-h-0 lg:overflow-hidden lg:border-b-0 lg:border-r">
          {tool === 'design' && (
            <DesignPanel
              onFiles={onFiles}
              onGalleryArtwork={(a) => studio.addImage(studio.rememberAsset(a))}
              busy={uploading}
              error={uploadError}
            />
          )}
          {tool === 'images' && <ImagesPanel assets={studio.assets} onAdd={studio.addImage} maxItems={desktop ? 6 : undefined} />}
          {tool === 'text' && <TextAddPanel onAdd={(init) => studio.addText(init)} />}
          {tool === 'layers' && (
            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-black">Layers</h2>
              {layersList(desktop ? 8 : undefined)}
            </div>
          )}
        </aside>

        <section className="order-1 flex min-w-0 flex-col gap-4 bg-[#F5F5F5] p-4 sm:p-6 lg:order-3 lg:min-h-0 lg:gap-3 lg:overflow-hidden lg:p-4">
          <StudioToolbar
            canUndo={studio.canUndo}
            canRedo={studio.canRedo}
            onUndo={studio.undo}
            onRedo={studio.redo}
            views={views}
            activeView={view?.id ?? 'view-0'}
            onView={setActiveViewId}
            zoom={zoom}
            onZoomIn={() => canvasRef.current?.zoomBy(1.25)}
            onZoomOut={() => canvasRef.current?.zoomBy(0.8)}
            onZoomReset={() => canvasRef.current?.setZoom(1)}
            onFit={() => canvasRef.current?.fit()}
            fullscreen={fullscreen}
            onFullscreen={toggleFullscreen}
            fullscreenSupported={fullscreenSupported}
          />
          <p className="text-[10px] text-[#717171]">Wheel to pan · Ctrl/Cmd + wheel to zoom · Space + drag to pan · Shift-click or drag a box to multi-select · Cmd/Ctrl + G to group · On touch screens use the zoom buttons</p>
          <Canvas
            ref={canvasRef}
            baseImage={view?.image}
            baseAlt={`${parent.name} ${view?.label ?? ''}`.trim()}
            layers={studio.layers}
            selectedIds={studio.selectedIds}
            onSelect={studio.select}
            onLiveChange={studio.patchManyLive}
            onSettle={studio.settleGesture}
            onCommitText={(id, text) => studio.patch(id, { text, name: text.split('\n')[0].slice(0, 24) })}
            onMeasure={(m) => {
              setStagePx(m.stage);
              setLayerSizes(m.sizes);
            }}
            onZoomChange={setZoom}
          />
          <div className="flex shrink-0 justify-center gap-3">
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

        <aside className="order-4 space-y-6 border-t border-[#EEEEEE] p-5 lg:flex lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-3 lg:overflow-hidden lg:border-l lg:border-t-0 lg:p-4">
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
          <div role="tablist" aria-label="Editor panel" className="hidden rounded-lg bg-[#F5F5F5] p-0.5 lg:flex">
            {(['layers', 'properties'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={panelTab === t}
                onClick={() => setPanelTab(t)}
                className={`${TAB_BASE} ${panelTab === t ? 'bg-black text-white' : 'text-[#717171] hover:text-black'}`}
              >
                {t === 'layers' ? 'Layers' : 'Properties'}
              </button>
            ))}
          </div>
          <div className="space-y-6 lg:min-h-0 lg:flex-1 lg:space-y-0 lg:overflow-hidden">
          <div className={`border-t border-[#EEEEEE] pt-5 lg:border-t-0 lg:pt-0 ${panelTab === 'properties' ? 'lg:hidden' : ''}`}>
            <h2 className={`${SECTION_TITLE} lg:sr-only`}>Design Layers</h2>
            {layersList(desktop ? 5 : undefined)}
          </div>
          {studio.selectedIds.length > 0 && (
            <section aria-label="Properties" className={`space-y-5 border-t border-[#EEEEEE] pt-5 lg:space-y-3 lg:border-t-0 lg:pt-0 ${panelTab === 'layers' ? 'lg:hidden' : ''}`}>
              <h2 className={`${SECTION_TITLE} lg:sr-only`}>Properties</h2>
              {selectedText && (
                <TextInspector
                  layer={selectedText}
                  onLive={(p) => studio.patchLive(selectedText.id, p)}
                  onCommit={(p) => studio.patch(selectedText.id, p)}
                  onSettle={studio.settleGesture}
                />
              )}
              {selectedImage && (
                <p className="truncate text-xs font-semibold text-black">{selectedImage.name}</p>
              )}
              {studio.selectedIds.length > 1 && (
                <SelectionInspector
                  count={studio.selectedIds.length}
                  isGroup={isGroup}
                  canGroup={studio.selectedIds.length > 1 && !isGroup}
                  onGroup={studio.group}
                  onUngroup={studio.ungroup}
                  onDelete={studio.removeSelected}
                />
              )}
              <AlignPanel
                disabled={false}
                canDistribute={units.length >= 3}
                onAlign={(edge) => studio.align(edge, layerSizes, stagePx)}
                onDistribute={(axis) => studio.distribute(axis, layerSizes, stagePx)}
              />
              {studio.selected && (
                <PositionScalePanel
                  layer={studio.selected}
                  onFlip={(axis) => studio.flip(studio.selected!.id, axis)}
                  onScaleLive={(scale) => studio.patchLive(studio.selected!.id, { scale })}
                  onSettle={studio.settleGesture}
                />
              )}
            </section>
          )}
            {!hasSelection && panelTab === 'properties' && (
              <p className="hidden rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171] lg:block">Select a layer to edit its properties.</p>
            )}
          </div>

          <div className="space-y-6 lg:mt-auto lg:space-y-2">
          {status && (
            <p role={status.kind === 'error' ? 'alert' : 'status'} className={`rounded-lg px-4 py-3 text-xs ${status.kind === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>
              {status.text}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              aria-label="Order now"
              disabled={!hasAnyLayers}
              title={hasAnyLayers ? undefined : 'Add something to your design first'}
              onClick={() => setQuoteOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-black px-2 py-3.5 text-[10px] lg:py-2.5 font-bold uppercase tracking-widest text-white hover:bg-[#333333] disabled:bg-[#EEEEEE] disabled:text-[#9A9A9A]"
            >
              <MessageSquareQuote className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Order now</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="flex items-center justify-center gap-2 rounded-lg border border-black bg-white px-4 py-3.5 text-[11px] lg:py-2.5 font-bold uppercase tracking-widest text-black hover:bg-[#F5F5F5] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Design'}
            </button>
          </div>
          </div>
        </aside>
      </div>
      {quoteOpen && (
        <QuoteRequestModal
          parentProductId={parent.id}
          parentName={parent.name}
          size={size}
          colorName={colorName}
          design={quoteDesign}
          views={views}
          onClose={() => setQuoteOpen(false)}
        />
      )}
    </div>
  );
}
