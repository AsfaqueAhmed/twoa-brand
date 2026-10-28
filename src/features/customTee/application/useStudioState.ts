'use client';

import { useCallback, useRef, useState } from 'react';
import { type History, createHistory, live, settle, commit, undo as undoH, redo as redoH, canUndo, canRedo } from '../domain/history';
import {
  type AlignEdge,
  type Layer,
  type LayerPatch,
  addLayer,
  createImageLayer,
  createTextLayer,
  flipLayer,
  toggleVisible,
  updateLayer,
} from '../domain/layers';
import { expandToGroups, groupLayers, isSingleUnit, moveUnit as moveUnitDomain, removeLayers, reorderUnit as reorderUnitDomain, ungroupLayers } from '../domain/grouping';
import { type CanvasPx, type Size, alignLayers, distributeLayers, moveLayersBy } from '../domain/geometry';

export type Asset = { id: string; name: string; src: string; aspect: number };
export type TextInit = Omit<Parameters<typeof createTextLayer>[0], 'id'>;

type ByView = Record<string, Layer[]>;
const EMPTY: Layer[] = [];
// Applies `fn` to one view's layers; returns the SAME record when nothing changed so history no-ops still work.
const mapView = (rec: ByView, viewId: string, fn: (ls: Layer[]) => Layer[]): ByView => {
  const current = rec[viewId] ?? EMPTY;
  const next = fn(current);
  return next === current ? rec : { ...rec, [viewId]: next };
};

export function useStudioState(initialLayersByView: ByView, viewId: string) {
  const [history, setHistory] = useState<History<ByView>>(() => createHistory(initialLayersByView));
  const [rawSelection, setRawSelection] = useState<string[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const counter = useRef(0);
  const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${counter.current++}`;

  const layersByView = history.present;
  const layers = layersByView[viewId] ?? EMPTY;
  // Validated against the active view's layers: a stale or hidden id (after undo, or on another view) is never exposed.
  const selectedIds = rawSelection.filter((id) => layers.some((l) => l.id === id && l.visible));
  const selected = selectedIds.length === 1 ? (layers.find((l) => l.id === selectedIds[0]) ?? null) : null;

  const change = useCallback(
    (fn: (ls: Layer[]) => Layer[]) => setHistory((h) => commit(h, mapView(h.present, viewId, fn))),
    [viewId],
  );

  const rememberAsset = useCallback((a: Omit<Asset, 'id'>): Asset => {
    const asset = { ...a, id: `asset-${Date.now().toString(36)}-${counter.current++}` };
    setAssets((prev) => [...prev, asset]);
    return asset;
  }, []);

  const addAndSelect = useCallback(
    (layer: Layer) => {
      setHistory((h) => commit(h, mapView(h.present, viewId, (ls) => addLayer(ls, layer))));
      setRawSelection([layer.id]);
    },
    [viewId],
  );

  const addImage = useCallback(
    (a: Asset) => addAndSelect(createImageLayer({ id: nextId('layer'), name: a.name, src: a.src, aspect: a.aspect })),
    [addAndSelect], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const addText = useCallback(
    (init: TextInit) => addAndSelect(createTextLayer({ id: nextId('layer'), ...init })),
    [addAndSelect], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const applyPatches = (ls: Layer[], patches: Record<string, LayerPatch>): Layer[] => {
    let out = ls;
    for (const [id, p] of Object.entries(patches)) out = updateLayer(out, id, p);
    return out;
  };

  const removeIds = (ids: string[]) => {
    if (!layers.some((l) => ids.includes(l.id))) return;
    change((ls) => removeLayers(ls, ids));
    setRawSelection((cur) => cur.filter((id) => !ids.includes(id)));
  };

  return {
    layers,
    layersByView,
    selectedIds,
    selected,
    assets,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    select: (ids: string[]) => setRawSelection(ids),
    selectAll: () => setRawSelection(layers.filter((l) => l.visible).map((l) => l.id)),
    rememberAsset,
    addImage,
    addText,
    patch: (id: string, p: LayerPatch) => change((ls) => updateLayer(ls, id, p)),
    patchMany: (ids: string[], p: LayerPatch) => change((ls) => applyPatches(ls, Object.fromEntries(ids.map((id) => [id, p])))),
    patchLive: (id: string, p: LayerPatch) => setHistory((h) => live(h, mapView(h.present, viewId, (ls) => updateLayer(ls, id, p)))),
    patchManyLive: (patches: Record<string, LayerPatch>) => setHistory((h) => live(h, mapView(h.present, viewId, (ls) => applyPatches(ls, patches)))),
    settleGesture: () => setHistory((h) => settle(h)),
    nudge: (ids: string[], dx: number, dy: number) => change((ls) => moveLayersBy(ls, ids, dx, dy)),
    removeSelected: () => removeIds(selectedIds),
    removeIds,
    setVisible: (ids: string[], visible: boolean) => {
      change((ls) => {
        let out = ls;
        for (const l of ls) if (ids.includes(l.id) && l.visible !== visible) out = toggleVisible(out, l.id);
        return out;
      });
      if (!visible) setRawSelection((cur) => cur.filter((id) => !ids.includes(id)));
    },
    flip: (id: string, axis: 'x' | 'y') => change((ls) => flipLayer(ls, id, axis)),
    group: () => {
      if (selectedIds.length > 1 && isSingleUnit(layers, selectedIds)) return; // a whole group is already selected
      const id = nextId('group');
      change((ls) => groupLayers(ls, selectedIds, id));
      setRawSelection((cur) => expandToGroups(layers, cur));
    },
    ungroup: () => change((ls) => ungroupLayers(ls, selectedIds)),
    align: (edge: AlignEdge, sizes: Record<string, Size>, canvas: CanvasPx) => change((ls) => alignLayers(ls, selectedIds, sizes, edge, canvas)),
    distribute: (axis: 'horizontal' | 'vertical', sizes: Record<string, Size>, canvas: CanvasPx) =>
      change((ls) => distributeLayers(ls, selectedIds, sizes, axis, canvas)),
    moveUnit: (id: string, dir: 'up' | 'down') => change((ls) => moveUnitDomain(ls, id, dir)),
    reorderUnit: (id: string, toUnitIndex: number) => change((ls) => reorderUnitDomain(ls, id, toUnitIndex)),
    undo: () => setHistory((h) => undoH(h)),
    redo: () => setHistory((h) => redoH(h)),
  };
}
