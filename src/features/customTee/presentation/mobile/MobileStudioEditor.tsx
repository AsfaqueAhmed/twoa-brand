'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ParentProduct } from '@/shared/domain/types';
import type { ParentCardData } from '../../domain/cards';
import {
  type AlignEdge,
  type Layer,
  type LayerPatch,
  alignLayer,
} from '../../domain/layers';
import {
  DESIGN_STORAGE_KEY,
  type StudioDesign,
  pruneLayersByView,
  serializeDesign,
  validateArtworkFile,
} from '../../domain/design';
import { HANDOFF_KEY, resolveStudioTarget } from '../../domain/studioTarget';
import { buildViews } from '../../domain/views';
import { fileToDataUrl } from '../../application/imageUpload';
import { useStudioState, type Asset } from '../../application/useStudioState';

import MobileHeader from './MobileHeader';
import MobileCanvas from './MobileCanvas';
import MobileToolDock, { type MobileToolTab } from './MobileToolDock';
import MobileBottomSheet from './MobileBottomSheet';
import AddDesignSheet from './sheets/AddDesignSheet';
import TextEditorSheet from './sheets/TextEditorSheet';
import DesignSettingsSheet from './sheets/DesignSettingsSheet';
import LayersListSheet from './sheets/LayersListSheet';
import { Copy, Settings2, Trash2 } from 'lucide-react';
import type { CanvasPx, Size } from '../../domain/geometry';

type Props = {
  parent: ParentProduct;
  card: ParentCardData;
  initialSize: string;
  initialColor?: string;
  initialLayersByView: Record<string, Layer[]>;
  refreshParents: () => Promise<ParentProduct[]>;
};

type SheetType = 'add-design' | 'text' | 'settings' | 'layers' | null;

export default function MobileStudioEditor({
  parent,
  card,
  initialSize,
  initialColor,
  initialLayersByView,
  refreshParents,
}: Props) {
  const router = useRouter();
  const size = initialSize;
  const colorName =
    initialColor && card.colors.some((c) => c.name === initialColor) ? initialColor : card.colors[0]?.name;

  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [activeTool, setActiveTool] = useState<MobileToolTab | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [measure, setMeasure] = useState<{ stage: CanvasPx; sizes: Record<string, Size> } | null>(null);

  const color = card.colors.find((c) => c.name === colorName);
  const views = useMemo(() => buildViews(parent, color), [parent, color]);
  const [activeViewId, setActiveViewId] = useState(views[0]?.id ?? 'view-0');
  const view = views.find((v) => v.id === activeViewId) ?? views[0];

  const initialPruned = useMemo(
    () => pruneLayersByView(initialLayersByView, views.map((v) => v.id)),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const studio = useStudioState(initialPruned, view?.id ?? 'view-0');

  // When selection changes to empty, close settings sheet if open
  useEffect(() => {
    if (studio.selectedIds.length === 0 && activeSheet === 'settings') {
      setActiveSheet(null);
      setActiveTool(null);
    }
  }, [studio.selectedIds, activeSheet]);

  // Tool Dock selection
  const handleSelectTab = (tab: MobileToolTab) => {
    setActiveTool(tab);
    if (tab === 'design') {
      setActiveSheet('add-design');
    } else if (tab === 'text') {
      setActiveSheet('text');
    } else if (tab === 'images') {
      setActiveSheet('add-design');
    } else if (tab === 'layers') {
      setActiveSheet('layers');
    }
  };

  const closeSheet = () => {
    setActiveSheet(null);
    setActiveTool(null);
    setUploadError(null);
  };

  // Upload handler
  const handleFiles = async (files: FileList | null) => {
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
          const asset = studio.rememberAsset({ name: file.name, src, aspect });
          studio.addImage(asset);
          closeSheet();
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : 'Could not read image file.');
        }
      }
    } finally {
      setUploading(false);
    }
  };

  // Select asset from session uploads
  const handleSelectAsset = (asset: Asset) => {
    studio.addImage(asset);
    closeSheet();
  };

  // Select artwork from Free Gallery
  const handleSelectArtwork = (artwork: { name: string; src: string; aspect: number }) => {
    const asset = studio.rememberAsset({
      name: artwork.name,
      src: artwork.src,
      aspect: artwork.aspect,
    });
    studio.addImage(asset);
    closeSheet();
  };

  // Text handlers
  const handleAddText = (textStr: string, fontFamily: string, textColor: string) => {
    studio.addText({
      text: textStr,
      fontFamily,
      color: textColor,
    });
    closeSheet();
  };

  const handleUpdateText = (patch: LayerPatch) => {
    if (studio.selected?.type === 'text') {
      studio.patch(studio.selected.id, patch);
    }
  };

  // Duplicate selected layer (keeps position, size, rotation, flip and opacity)
  const handleDuplicate = () => {
    if (studio.selected) studio.duplicate(studio.selected.id);
  };

  // Alignment: same measured-box align as the web studio
  const handleAlign = (edge: AlignEdge) => {
    if (!measure || !studio.selected) return;
    studio.align(edge, measure.sizes, measure.stage);
  };

  // Flip
  const handleFlip = (axis: 'x' | 'y') => {
    const l = studio.selected;
    if (!l) return;
    if (axis === 'x') studio.patch(l.id, { flipX: !l.flipX });
    else studio.patch(l.id, { flipY: !l.flipY });
  };

  // Save session design
  const save = async () => {
    setSaving(true);
    setSaveToast(null);
    try {
      const fresh = await refreshParents();
      if (!resolveStudioTarget(fresh, { parentProductId: parent.id, size })) {
        setSaveToast('This tee is no longer in stock for that size.');
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
        setSaveToast('Design saved for this session!');
      } catch {
        setSaveToast('Design file too large to save in this browser session.');
      }
    } catch {
      setSaveToast('Could not save design. Please try again.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  // Subtitle formatted
  const subtitle = `${colorName || parent.name} • Size ${size}`;

  return (
    <div className="relative flex h-dvh w-full flex-col bg-white overflow-hidden font-sans select-none">
      {/* Header */}
      <MobileHeader
        title="Design Studio"
        subtitle={subtitle}
        onBack={() => router.push('/custom-tee')}
        onSave={save}
        saving={saving}
      />

      {/* Save Notification Toast */}
      {saveToast && (
        <div className="absolute top-16 left-4 right-4 z-50 flex items-center justify-center rounded-2xl bg-zinc-900/95 px-4 py-2.5 text-xs font-bold text-white shadow-xl backdrop-blur-md animate-in fade-in duration-200">
          {saveToast}
        </div>
      )}

      {/* Canvas */}
      <MobileCanvas
        views={views}
        activeViewId={activeViewId}
        onSelectView={setActiveViewId}
        baseImage={view?.image}
        baseAlt={`${parent.name} ${view?.label || ''}`}
        layers={studio.layers}
        selectedIds={studio.selectedIds}
        onSelect={studio.select}
        onLiveChange={studio.patchManyLive}
        onSettle={studio.settleGesture}
        canUndo={studio.canUndo}
        canRedo={studio.canRedo}
        onUndo={studio.undo}
        onRedo={studio.redo}
        onMeasure={setMeasure}
      />

      {/* Selection bar: edit/duplicate/delete without a sheet covering the canvas */}
      {studio.selected && activeSheet === null && (
        <div className="absolute inset-x-4 bottom-[88px] z-30 mx-auto flex max-w-sm items-center justify-between rounded-2xl border border-zinc-200 bg-white/95 p-1.5 shadow-lg backdrop-blur-md animate-in fade-in duration-150">
          <span className="min-w-0 flex-1 truncate px-3 text-xs font-bold text-zinc-900">{studio.selected.name}</span>
          <button
            type="button"
            onClick={() => setActiveSheet('settings')}
            aria-label="Edit settings"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100 active:scale-95"
          >
            <Settings2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            aria-label="Duplicate layer"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100 active:scale-95"
          >
            <Copy className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => studio.removeSelected()}
            aria-label="Delete layer"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-red-600 hover:bg-red-50 active:scale-95"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Fixed Bottom Tool Dock */}
      <MobileToolDock activeTab={activeTool} onSelectTab={handleSelectTab} />

      {/* Bottom Sheet Modal Container */}
      <MobileBottomSheet
        isOpen={activeSheet !== null}
        onClose={closeSheet}
        title={
          activeSheet === 'add-design'
            ? 'Add Design'
            : activeSheet === 'text'
            ? 'Text'
            : activeSheet === 'settings'
            ? 'Design Settings'
            : activeSheet === 'layers'
            ? 'Layers'
            : ''
        }
      >
        {activeSheet === 'add-design' && (
          <AddDesignSheet
            assets={studio.assets}
            onUploadFiles={handleFiles}
            onSelectAsset={handleSelectAsset}
            onSelectArtwork={handleSelectArtwork}
            uploading={uploading}
            uploadError={uploadError}
            initialSubTab={activeTool === 'images' ? 'my-designs' : 'upload'}
          />
        )}

        {activeSheet === 'text' && (
          <TextEditorSheet
            activeTextLayer={studio.selected?.type === 'text' ? studio.selected : null}
            onAddText={handleAddText}
            onUpdateText={handleUpdateText}
            onDone={closeSheet}
          />
        )}

        {activeSheet === 'settings' && studio.selected && (
          <DesignSettingsSheet
            layer={studio.selected}
            onPatch={(patch) => studio.patch(studio.selected!.id, patch)}
            onLive={(patch) => studio.patchLive(studio.selected!.id, patch)}
            onSettle={studio.settleGesture}
            onAlign={handleAlign}
            onFlip={handleFlip}
            onDuplicate={handleDuplicate}
            onDelete={() => {
              studio.removeSelected();
              closeSheet();
            }}
          />
        )}

        {activeSheet === 'layers' && (
          <LayersListSheet
            layers={studio.layers}
            selectedIds={studio.selectedIds}
            onSelect={studio.select}
            onSetVisible={(id, v) => studio.setVisible([id], v)}
            onRemove={studio.removeIds}
            onMoveUp={() => {
              const id = studio.selectedIds[0];
              if (id) studio.moveUnit(id, 'up');
            }}
            onMoveDown={() => {
              const id = studio.selectedIds[0];
              if (id) studio.moveUnit(id, 'down');
            }}
            onSelectLayerToEdit={() => setActiveSheet('settings')}
          />
        )}
      </MobileBottomSheet>
    </div>
  );
}
