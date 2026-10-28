'use client';

import { Maximize, Maximize2, Minimize2, Redo2, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import type { StudioView } from '../../domain/views';

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  views: StudioView[];
  activeView: string;
  onView: (id: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFit: () => void;
  fullscreen: boolean;
  onFullscreen: () => void;
  fullscreenSupported: boolean;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const GROUP = 'flex items-center gap-1 rounded-lg border border-[#EEEEEE] bg-white p-1';
const ICON_BTN = 'flex h-8 w-8 items-center justify-center rounded-md text-black hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:text-[#CDCDCD] disabled:hover:bg-transparent';

export default function StudioToolbar({ canUndo, canRedo, onUndo, onRedo, views, activeView, onView, zoom, onZoomIn, onZoomOut, onZoomReset, onFit, fullscreen, onFullscreen, fullscreenSupported }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className={GROUP}>
        <button type="button" aria-label="Undo" title="Undo" disabled={!canUndo} onClick={onUndo} className={ICON_BTN}>
          <Undo2 className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Redo" title="Redo" disabled={!canRedo} onClick={onRedo} className={ICON_BTN}>
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      <div className={GROUP} role="tablist" aria-label="Views">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={v.id === activeView}
            onClick={() => onView(v.id)}
            className={`rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
              v.id === activeView ? 'bg-black text-white' : 'text-[#717171] hover:text-black'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className={GROUP}>
        <button type="button" aria-label="Zoom out" title="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={onZoomOut} className={ICON_BTN}>
          <ZoomOut className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Reset zoom to 100%" title="Reset zoom to 100%" onClick={onZoomReset} className="h-8 w-12 rounded-md text-center text-[11px] font-semibold text-black hover:bg-[#F5F5F5]">
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" aria-label="Zoom in" title="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={onZoomIn} className={ICON_BTN}>
          <ZoomIn className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Fit to screen" title="Fit to screen" onClick={onFit} className={ICON_BTN}>
          <Maximize className="h-4 w-4" />
        </button>
        {fullscreenSupported && (
        <button type="button" aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={onFullscreen} className={ICON_BTN}>
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        )}
      </div>
    </div>
  );
}
