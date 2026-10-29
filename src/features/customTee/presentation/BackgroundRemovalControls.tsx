'use client';

import { useEffect, useState } from 'react';
import { Eraser, RefreshCw, RotateCcw } from 'lucide-react';
import type { ImageLayer } from '../domain/layers';
import { DEFAULT_TOLERANCE, MAX_TOLERANCE, MIN_TOLERANCE } from '@/shared/lib/backgroundRemoval';
import { removeSolidBackgroundFromBlob, srcToBlob } from '@/shared/lib/removeBackground';
import { blobToDesignImage } from '../application/imageUpload';

type Props = {
  layer: ImageLayer;
  /** Commits the new image src for `layerId` (an undoable studio edit). */
  onApply: (layerId: string, src: string) => void;
  variant: 'desktop' | 'mobile';
};

const STYLES = {
  desktop: {
    wrap: 'space-y-3 rounded-lg border border-[#EEEEEE] p-3',
    title: 'text-[10px] font-bold uppercase tracking-wider text-[#717171]',
    btn: 'flex w-full items-center justify-center gap-2 rounded-lg border border-[#EEEEEE] px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-black hover:border-black disabled:cursor-not-allowed disabled:text-[#CDCDCD] disabled:hover:border-[#EEEEEE]',
    muted: 'text-[11px] text-[#717171]',
  },
  mobile: {
    wrap: 'space-y-3',
    title: 'mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500',
    btn: 'flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 text-xs font-bold text-zinc-900 transition active:scale-98 disabled:opacity-40',
    muted: 'text-[11px] text-zinc-500',
  },
} as const;

// "Remove background" for the selected image layer: an instant solid-colour remover. The result replaces the layer's image as a normal (undoable) edit.
export default function BackgroundRemovalControls({ layer, onApply, variant }: Props) {
  const s = STYLES[variant];
  const [tolerance, setTolerance] = useState(DEFAULT_TOLERANCE);
  const [includeEnclosed, setIncludeEnclosed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [previous, setPrevious] = useState<{ layerId: string; before: string; after: string } | null>(null);

  useEffect(() => {
    setError('');
    setStatus('');
  }, [layer.id]);

  const run = async () => {
    if (busy) return;
    const layerId = layer.id;
    const before = layer.src;
    setBusy(true);
    setError('');
    setStatus('Removing background…');
    try {
      const input = await srcToBlob(before);
      const res = await removeSolidBackgroundFromBlob(input, tolerance, includeEnclosed);
      if (!res.changed) {
        setStatus('');
        setError('No matching background found. Try a higher tolerance.');
        return;
      }
      const { src } = await blobToDesignImage(res.blob, `${layer.name || 'design'}-no-bg`);
      onApply(layerId, src);
      setPrevious({ layerId, before, after: src });
      setStatus('Background removed. Use Undo or Restore original to go back.');
    } catch (err) {
      setStatus('');
      setError(err instanceof Error ? err.message : 'Background removal failed. Your image was not changed.');
    } finally {
      setBusy(false);
    }
  };

  const canRestore = previous && previous.layerId === layer.id && previous.after === layer.src;

  return (
    <div className={s.wrap}>
      <span className={s.title}>Remove background</span>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label htmlFor={`bg-tolerance-${variant}`} className={`${s.muted} shrink-0`}>Tolerance</label>
          <input
            id={`bg-tolerance-${variant}`}
            type="range"
            min={MIN_TOLERANCE}
            max={MAX_TOLERANCE}
            value={tolerance}
            disabled={busy}
            onChange={(e) => setTolerance(Number(e.target.value))}
            className="min-w-0 flex-1 accent-black"
          />
          <span className={`${s.muted} w-6 shrink-0 text-right tabular-nums`}>{tolerance}</span>
        </div>
        <label className={`${s.muted} flex items-center gap-2`}>
          <input
            type="checkbox"
            checked={includeEnclosed}
            disabled={busy}
            onChange={(e) => setIncludeEnclosed(e.target.checked)}
            className="accent-black"
          />
          Also remove inside areas (e.g. inside a circle)
        </label>
        <button type="button" disabled={busy} onClick={() => void run()} className={s.btn}>
          <Eraser className="h-4 w-4" />
          Remove background
        </button>
      </div>

      {canRestore && !busy && (
        <button type="button" onClick={() => {
            onApply(previous.layerId, previous.before);
            setStatus('');
          }} className={s.btn}>
          <RotateCcw className="h-4 w-4" />
          Restore original
        </button>
      )}

      {status && (
        <p role="status" className={`flex items-center gap-2 ${s.muted}`}>
          {busy && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</p>
      )}
    </div>
  );
}
