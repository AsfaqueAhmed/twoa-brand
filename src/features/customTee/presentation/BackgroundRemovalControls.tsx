'use client';

import { useEffect, useState } from 'react';
import { Eraser, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import type { ImageLayer } from '../domain/layers';
import { DEFAULT_TOLERANCE, MAX_TOLERANCE, MIN_TOLERANCE } from '@/shared/lib/backgroundRemoval';
import {
  AI_MODEL_NOTE,
  aiModelNoteSeen,
  detectAiBackgroundRemoval,
  markAiModelNoteSeen,
  progressLabel,
  removeBackgroundAi,
  removeSolidBackgroundFromBlob,
  srcToBlob,
} from '@/shared/lib/removeBackground';
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
    primary: 'rounded-lg bg-black px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#333333]',
    secondary: 'rounded-lg border border-[#EEEEEE] px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-black hover:border-black',
    muted: 'text-[11px] text-[#717171]',
    note: 'space-y-2 rounded-lg bg-[#F5F5F5] p-3',
  },
  mobile: {
    wrap: 'space-y-3',
    title: 'mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500',
    btn: 'flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 text-xs font-bold text-zinc-900 transition active:scale-98 disabled:opacity-40',
    primary: 'rounded-xl bg-black px-4 py-2.5 text-xs font-bold text-white active:scale-95 transition',
    secondary: 'rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-900 active:scale-95 transition',
    muted: 'text-[11px] text-zinc-500',
    note: 'space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3',
  },
} as const;

// "Remove background" for the selected image layer: an instant solid-colour remover and, where the device can
// handle it, an AI remover. The result replaces the layer's image as a normal (undoable) edit.
export default function BackgroundRemovalControls({ layer, onApply, variant }: Props) {
  const s = STYLES[variant];
  const [aiSupported, setAiSupported] = useState(false);
  const [tolerance, setTolerance] = useState(DEFAULT_TOLERANCE);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [confirmAi, setConfirmAi] = useState(false);
  const [previous, setPrevious] = useState<{ layerId: string; before: string; after: string } | null>(null);

  useEffect(() => setAiSupported(detectAiBackgroundRemoval()), []);
  useEffect(() => {
    setError('');
    setStatus('');
    setConfirmAi(false);
  }, [layer.id]);

  const run = async (mode: 'solid' | 'ai') => {
    if (busy) return;
    const layerId = layer.id;
    const before = layer.src;
    setBusy(true);
    setError('');
    setStatus(mode === 'ai' ? 'Preparing…' : 'Removing background…');
    try {
      const input = await srcToBlob(before);
      let output: Blob;
      if (mode === 'solid') {
        const res = await removeSolidBackgroundFromBlob(input, tolerance);
        if (!res.changed) {
          setStatus('');
          setError('No solid background found at the edges. Try a higher tolerance or the AI remover.');
          return;
        }
        output = res.blob;
      } else {
        output = await removeBackgroundAi(input, (p) => setStatus(progressLabel(p)));
      }
      const { src } = await blobToDesignImage(output, `${layer.name || 'design'}-no-bg`);
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

  const startAi = () => {
    if (aiModelNoteSeen()) void run('ai');
    else setConfirmAi(true);
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
        <button type="button" disabled={busy} onClick={() => void run('solid')} className={s.btn}>
          <Eraser className="h-4 w-4" />
          Remove solid background
        </button>
      </div>

      {aiSupported && !confirmAi && (
        <button type="button" disabled={busy} onClick={startAi} className={s.btn}>
          <Sparkles className="h-4 w-4" />
          AI remove background
        </button>
      )}

      {confirmAi && (
        <div role="dialog" aria-label="AI background removal" className={s.note}>
          <p className={s.muted}>{AI_MODEL_NOTE}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmAi(false)} className={s.secondary}>Cancel</button>
            <button
              type="button"
              onClick={() => {
                markAiModelNoteSeen();
                setConfirmAi(false);
                void run('ai');
              }}
              className={s.primary}
            >
              Continue
            </button>
          </div>
        </div>
      )}

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
