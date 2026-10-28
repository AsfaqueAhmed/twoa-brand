'use client';

import { useCallback, useRef, useState } from 'react';
import { type History, createHistory, live, settle, commit, undo as undoH, redo as redoH, canUndo, canRedo } from '../domain/history';
import {
  type AlignEdge,
  type Layer,
  type LayerPatch,
  addLayer,
  alignLayer,
  createImageLayer,
  createTextLayer,
  flipLayer,
  moveLayer,
  removeLayer,
  reorderLayer,
  toggleVisible,
  updateLayer,
} from '../domain/layers';

export type Asset = { id: string; name: string; src: string; aspect: number };

export function useStudioState(initialLayers: Layer[]) {
  const [history, setHistory] = useState<History<Layer[]>>(() => createHistory(initialLayers));
  const [rawSelectedId, setSelectedId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const counter = useRef(0);
  const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${counter.current++}`;

  const layers = history.present;
  const selected = layers.find((l) => l.id === rawSelectedId) ?? null;
  const selectedId = selected ? selected.id : null; // validated: a stale id (e.g. after undo) is never exposed

  const change = useCallback((fn: (ls: Layer[]) => Layer[]) => setHistory((h) => commit(h, fn(h.present))), []);

  const rememberAsset = useCallback((a: Omit<Asset, 'id'>): Asset => {
    const asset = { ...a, id: `asset-${Date.now().toString(36)}-${counter.current++}` };
    setAssets((prev) => [...prev, asset]);
    return asset;
  }, []);

  const addImage = useCallback((a: Asset) => {
    const layer = createImageLayer({ id: nextId('layer'), name: a.name, src: a.src, aspect: a.aspect });
    setHistory((h) => commit(h, addLayer(h.present, layer)));
    setSelectedId(layer.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addText = useCallback((text: string, fontFamily: string, color: string) => {
    const layer = createTextLayer({ id: nextId('layer'), text, fontFamily, color });
    setHistory((h) => commit(h, addLayer(h.present, layer)));
    setSelectedId(layer.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    layers,
    selectedId,
    selected,
    assets,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    select: setSelectedId,
    rememberAsset,
    addImage,
    addText,
    patch: (id: string, p: LayerPatch) => change((ls) => updateLayer(ls, id, p)),
    patchLive: (id: string, p: LayerPatch) => setHistory((h) => live(h, updateLayer(h.present, id, p))),
    settleGesture: () => setHistory((h) => settle(h)),
    remove: (id: string) => {
      if (!layers.some((l) => l.id === id)) return;
      change((ls) => removeLayer(ls, id));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    toggle: (id: string) => change((ls) => toggleVisible(ls, id)),
    flip: (id: string, axis: 'x' | 'y') => change((ls) => flipLayer(ls, id, axis)),
    align: (id: string, size: { w: number; h: number }, edge: AlignEdge) =>
      setHistory((h) => {
        const layer = h.present.find((l) => l.id === id);
        return layer ? commit(h, updateLayer(h.present, id, alignLayer(layer, size, edge))) : h;
      }),
    move: (id: string, dir: 'up' | 'down') => change((ls) => moveLayer(ls, id, dir)),
    reorder: (id: string, toIndex: number) => change((ls) => reorderLayer(ls, id, toIndex)),
    undo: () => setHistory((h) => undoH(h)),
    redo: () => setHistory((h) => redoH(h)),
  };
}
