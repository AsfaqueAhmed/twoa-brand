'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Modal from './Modal';
import type { StudioDesign } from '../domain/design';
import type { StudioView } from '../domain/views';
import {
  buildQuoteFiles,
  dataUrlMime,
  extForMime,
  extractArtwork,
  generateQuoteId,
  validateQuoteContact,
  type QuoteContact,
} from '../domain/quote';
import { getOriginal } from '../application/artworkOriginals';
import { renderViewPng } from '../application/renderPreview';
import { submitQuote, uploadQuoteFile } from '../infrastructure/customQuoteRepository';

type Props = {
  parentProductId: string;
  parentName: string;
  size: string;
  colorName?: string;
  design: StudioDesign;
  views: StudioView[];
  onClose: () => void;
};

const LABEL = 'text-[10px] font-bold uppercase tracking-wider text-[#717171]';
const INPUT =
  'mt-1 w-full rounded-lg border border-[#EEEEEE] bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black disabled:bg-[#F5F5F5] disabled:text-[#9A9A9A]';
const BUTTON =
  'flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#333333] disabled:opacity-50';

export default function QuoteRequestModal({ parentProductId, parentName, size, colorName, design, views, onClose }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [same, setSame] = useState(false);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof QuoteContact, string>>>({});
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const busy = useRef(false);
  const sending = stage !== null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current) return;
    setError(null);
    const result = validateQuoteContact({ name, phone, whatsapp: same ? phone : whatsapp });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    busy.current = true;
    try {
      setStage('Preparing your design…');
      const id = generateQuoteId();
      const { design: extracted, sources } = extractArtwork(design);
      const files = buildQuoteFiles(id, views.map((v) => ({ id: v.id, label: v.label })), sources.map(dataUrlMime));

      const toRender = views.filter((v, i) => i === 0 || (design.layersByView[v.id] ?? []).length > 0);
      const previews = new Map<string, Blob>();
      for (const v of toRender) {
        previews.set(v.id, await renderViewPng({ baseImageUrl: v.image, layers: design.layersByView[v.id] ?? [] }));
      }
      files.previews = files.previews.filter((p) => previews.has(p.viewId));

      const artworkBlobs: Blob[] = [];
      for (let i = 0; i < sources.length; i++) {
        const original = getOriginal(sources[i]);
        if (original) {
          const mime = original.type || dataUrlMime(sources[i]);
          const ext = extForMime(mime);
          const current = files.artwork[i];
          if (!current.name.endsWith(`.${ext}`)) {
            const base = current.name.replace(/\.[^.]+$/, '');
            const newName = `${base}.${ext}`;
            files.artwork[i] = { name: newName, path: current.path.replace(current.name, newName) };
          }
          artworkBlobs.push(original);
        } else {
          artworkBlobs.push(await (await fetch(sources[i])).blob());
        }
      }

      setStage('Uploading your artwork…');
      for (const p of files.previews) await uploadQuoteFile('custom-previews', p.path, previews.get(p.viewId)!);
      for (let i = 0; i < artworkBlobs.length; i++) await uploadQuoteFile('custom-artwork', files.artwork[i].path, artworkBlobs[i]);

      setStage('Sending your request…');
      await submitQuote({
        id,
        contact: result.value,
        parentProductId,
        teeSize: size,
        colorName,
        design: extracted,
        files,
        website,
      });
      setDoneId(id);
    } catch (err) {
      setError(err instanceof Error && err.message ? `We couldn't send your request: ${err.message}` : "We couldn't send your request. Please try again.");
    } finally {
      busy.current = false;
      setStage(null);
    }
  };

  if (doneId) {
    return (
      <Modal onClose={onClose} title="Order now">
        <div className="flex flex-col items-center gap-3 pb-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" aria-hidden="true" />
          <h2 className="text-base font-bold text-black">Request sent</h2>
          <p className="text-sm text-[#717171]">Your quote request {doneId} is in. We&apos;ll contact you on WhatsApp soon.</p>
          <button type="button" onClick={onClose} className={`${BUTTON} mt-2 w-full`}>
            Close
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Order now">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4 pb-6">
        <div>
          <h2 className="text-base font-bold text-black">Order now</h2>
          <p className="mt-1 text-sm text-[#717171]">Tell us how to reach you and we&apos;ll send you a price on WhatsApp.</p>
          <p className="mt-1 text-[11px] text-[#717171]">
            {parentName} · Size {size}
            {colorName ? ` · ${colorName}` : ''}
          </p>
        </div>

        <div>
          <label className={LABEL} htmlFor="quote-name">Name</label>
          <input id="quote-name" className={INPUT} value={name} onChange={(e) => setName(e.target.value)} disabled={sending} autoComplete="name" aria-invalid={!!errors.name} />
          {errors.name && <p className="mt-1 text-xs text-red-700">{errors.name}</p>}
        </div>

        <div>
          <label className={LABEL} htmlFor="quote-phone">Phone</label>
          <input id="quote-phone" type="tel" className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={sending} autoComplete="tel" aria-invalid={!!errors.phone} />
          {errors.phone && <p className="mt-1 text-xs text-red-700">{errors.phone}</p>}
        </div>

        <div>
          <label className={LABEL} htmlFor="quote-whatsapp">WhatsApp number</label>
          <input
            id="quote-whatsapp"
            type="tel"
            className={INPUT}
            value={same ? phone : whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            disabled={sending || same}
            aria-invalid={!!errors.whatsapp}
          />
          {errors.whatsapp && <p className="mt-1 text-xs text-red-700">{errors.whatsapp}</p>}
          <label className="mt-2 flex items-center gap-2 text-xs text-black">
            <input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} disabled={sending} className="h-4 w-4 accent-black" />
            WhatsApp number is the same as my phone
          </label>
        </div>

        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </p>
        )}
        {stage && (
          <p role="status" className="flex items-center gap-2 text-xs text-[#717171]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {stage}
          </p>
        )}

        <button type="submit" disabled={sending} className={BUTTON}>
          {sending ? 'Sending…' : error ? 'Try again' : 'Send request'}
        </button>
      </form>
    </Modal>
  );
}
