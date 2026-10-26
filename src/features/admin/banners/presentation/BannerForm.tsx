'use client';

import { useMemo, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import ImageCropperModal from '@/features/admin/inventory/presentation/ImageCropperModal';
import HeroCarousel from '@/features/catalog/presentation/HeroCarousel';
import {
  DEFAULT_DESKTOP_ASPECT,
  DESKTOP_ASPECT_PRESETS,
  isSafeCtaHref,
  isValidDesktopAspect,
  type HomeBanner,
} from '@/features/catalog/domain/banner';
import { createBanner, removeBannerImage, updateBanner, uploadBannerImage } from '../infrastructure/bannerAdminRepository';

interface BannerFormProps {
  initial?: HomeBanner;
  nextPosition: number;
  onSaved: () => void;
  onCancel: () => void;
}

type Target = 'desktop' | 'mobile';

const inputClass =
  'w-full border border-[#EEEEEE] bg-white px-3 py-2.5 text-sm text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none';
const labelClass = 'block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5';

// crypto.randomUUID is unavailable outside secure contexts (plain http).
function newUuid(): string {
  const c: Partial<Crypto> | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function BannerForm({ initial, nextPosition, onSaved, onCancel }: BannerFormProps) {
  // A new banner needs its id up front so images can be uploaded to banners/<id>-*.
  const [id] = useState(() => initial?.id ?? newUuid());
  const [desktopImageUrl, setDesktopImageUrl] = useState(initial?.desktopImageUrl ?? '');
  const [mobileImageUrl, setMobileImageUrl] = useState(initial?.mobileImageUrl ?? '');
  const [eyebrow, setEyebrow] = useState(initial?.eyebrow ?? '');
  const [headline, setHeadline] = useState(initial?.headline ?? '');
  const [subtext, setSubtext] = useState(initial?.subtext ?? '');
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? '');
  const [ctaHref, setCtaHref] = useState(initial?.ctaHref ?? '');
  const [desktopAspect, setDesktopAspect] = useState<number>(initial?.desktopAspect ?? DEFAULT_DESKTOP_ASPECT);
  const [customShape, setCustomShape] = useState(
    () => !DESKTOP_ASPECT_PRESETS.some((p) => p.value === (initial?.desktopAspect ?? DEFAULT_DESKTOP_ASPECT))
  );
  const [customW, setCustomW] = useState(() => String(Number((initial?.desktopAspect ?? DEFAULT_DESKTOP_ASPECT).toFixed(2))));
  const [customH, setCustomH] = useState('1');
  const [cropTarget, setCropTarget] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fid = `banner-${id}`;

  const preview: HomeBanner = useMemo(
    () => ({
      id,
      position: 0,
      isActive: true,
      desktopImageUrl,
      mobileImageUrl: mobileImageUrl || undefined,
      eyebrow,
      headline,
      subtext,
      ctaLabel,
      ctaHref,
      desktopAspect: isValidDesktopAspect(desktopAspect) ? desktopAspect : DEFAULT_DESKTOP_ASPECT,
      createdAt: '',
    }),
    [id, desktopImageUrl, mobileImageUrl, eyebrow, headline, subtext, ctaLabel, ctaHref, desktopAspect]
  );

  const presetMatch = DESKTOP_ASPECT_PRESETS.find((p) => p.value === desktopAspect);
  const aspectLabel = presetMatch
    ? presetMatch.label
    : customShape
      ? `${customW}:${customH}`
      : String(Number(desktopAspect.toFixed(2)));

  const updateCustom = (w: string, h: string) => {
    setCustomW(w);
    setCustomH(h);
    const ratio = Number(w) / Number(h);
    setDesktopAspect(Number.isFinite(ratio) && Number(h) > 0 ? ratio : NaN);
  };

  const handleCropped = async (dataUrl: string) => {
    const target = cropTarget;
    setCropTarget(null);
    if (!target) return;
    setBusy(true);
    setError('');
    try {
      const url = await uploadBannerImage(id, target, dataUrl);
      if (target === 'desktop') setDesktopImageUrl(url);
      else setMobileImageUrl(url);
    } catch (err: any) {
      setError(err.message || 'Image upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desktopImageUrl) {
      setError('A desktop image is required.');
      return;
    }
    if (!isValidDesktopAspect(desktopAspect)) {
      setError('Desktop shape must be between 1:1 and 6:1.');
      return;
    }
    if (!ctaHref.trim() || !isSafeCtaHref(ctaHref)) {
      setError('Banner link is required and must start with / or https://');
      return;
    }
    setBusy(true);
    setError('');
    const payload = {
      desktopImageUrl,
      mobileImageUrl: mobileImageUrl || undefined,
      eyebrow: eyebrow.trim(),
      headline: headline.trim(),
      subtext: subtext.trim(),
      ctaLabel: ctaLabel.trim(),
      ctaHref: ctaHref.trim(),
      desktopAspect,
    };
    try {
      if (initial) {
        await updateBanner(id, payload);
        // Best-effort cleanup of images that were replaced or removed.
        if (initial.desktopImageUrl && initial.desktopImageUrl !== desktopImageUrl) {
          void removeBannerImage(initial.desktopImageUrl);
        }
        if (initial.mobileImageUrl && initial.mobileImageUrl !== mobileImageUrl) {
          void removeBannerImage(initial.mobileImageUrl);
        }
      }
      else await createBanner(id, { ...payload, isActive: true }, nextPosition);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save banner.');
    } finally {
      setBusy(false);
    }
  };

  const imageField = (label: string, target: Target, url: string, hint: string) => (
    <div>
      <span className={labelClass}>{label}</span>
      <button
        type="button"
        aria-label={`${target === 'desktop' ? 'Desktop' : 'Mobile'} image: ${url ? 'replace' : 'upload'}`}
        onClick={() => setCropTarget(target)}
        disabled={busy}
        className="flex w-full items-center gap-3 border border-dashed border-[#CFCFCF] p-3 text-left hover:border-black disabled:opacity-50"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-14 w-24 object-cover border border-[#EEEEEE]" />
        ) : (
          <ImagePlus className="h-6 w-6 text-[#919191]" />
        )}
        <span className="text-xs text-[#717171]">{url ? 'Replace image' : 'Upload image'} · {hint}</span>
      </button>
      {target === 'mobile' && url && (
        <button
          type="button"
          onClick={() => setMobileImageUrl('')}
          disabled={busy}
          className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#717171] hover:text-red-600 disabled:opacity-50"
        >
          Remove mobile image
        </button>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-2 border border-[#EEEEEE] p-4 sm:p-6 mb-8" id="banner-form">
      <div className="space-y-4">
        <div>
          <label htmlFor={`${fid}-shape`} className={labelClass}>Desktop shape</label>
          <select
            id={`${fid}-shape`}
            className={inputClass}
            value={customShape ? 'custom' : String(DESKTOP_ASPECT_PRESETS.findIndex((p) => p.value === desktopAspect))}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setCustomShape(true);
                updateCustom(customW, customH);
              } else {
                setCustomShape(false);
                setDesktopAspect(DESKTOP_ASPECT_PRESETS[Number(e.target.value)].value);
              }
            }}
          >
            {DESKTOP_ASPECT_PRESETS.map((p, i) => (
              <option key={p.label} value={String(i)}>{p.label}</option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          {customShape && (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${fid}-shape-w`} className={labelClass}>Width</label>
                <input
                  id={`${fid}-shape-w`}
                  type="number"
                  min="0"
                  step="any"
                  className={inputClass}
                  value={customW}
                  onChange={(e) => updateCustom(e.target.value, customH)}
                />
              </div>
              <div>
                <label htmlFor={`${fid}-shape-h`} className={labelClass}>Height</label>
                <input
                  id={`${fid}-shape-h`}
                  type="number"
                  min="0"
                  step="any"
                  className={inputClass}
                  value={customH}
                  onChange={(e) => updateCustom(customW, e.target.value)}
                />
              </div>
            </div>
          )}
          <p className="mt-1.5 text-[11px] text-[#717171]">
            The carousel uses the first banner&apos;s shape; other banners are cropped to fit.
          </p>
        </div>
        {imageField('Desktop image', 'desktop', desktopImageUrl, aspectLabel)}
        {imageField('Mobile image (optional)', 'mobile', mobileImageUrl, '4:5')}
        <div>
          <label htmlFor={`${fid}-eyebrow`} className={labelClass}>Eyebrow</label>
          <input id={`${fid}-eyebrow`} className={inputClass} value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${fid}-headline`} className={labelClass}>Headline</label>
          <input id={`${fid}-headline`} className={inputClass} value={headline} onChange={(e) => setHeadline(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${fid}-subtext`} className={labelClass}>Subtext</label>
          <textarea id={`${fid}-subtext`} className={inputClass} rows={2} value={subtext} onChange={(e) => setSubtext(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${fid}-cta-label`} className={labelClass}>Button label (optional)</label>
            <input id={`${fid}-cta-label`} className={inputClass} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`${fid}-cta-href`} className={labelClass}>Banner link</label>
            <input
              id={`${fid}-cta-href`}
              className={inputClass}
              placeholder="/ or https://…"
              value={ctaHref}
              onChange={(e) => setCtaHref(e.target.value)}
            />
          </div>
        </div>
        {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={busy}
            className="h-10 bg-black px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white hover:bg-[#333333] disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Save banner'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-10 border border-[#EEEEEE] px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-[#717171] hover:text-black disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>

      <div>
        <span className={labelClass}>Live preview</span>
        {desktopImageUrl ? (
          <div className="border border-[#EEEEEE]">
            <HeroCarousel banners={[preview]} />
          </div>
        ) : (
          <div className="flex aspect-[16/6] items-center justify-center border border-[#EEEEEE] text-xs text-[#919191]">
            Upload a desktop image to preview
          </div>
        )}
      </div>

      <ImageCropperModal
        isOpen={cropTarget !== null}
        onClose={() => setCropTarget(null)}
        onCropComplete={handleCropped}
        title={cropTarget === 'mobile' ? 'Crop mobile banner (4:5)' : `Crop desktop banner (${aspectLabel})`}
        aspect={cropTarget === 'mobile' ? 4 / 5 : isValidDesktopAspect(desktopAspect) ? desktopAspect : DEFAULT_DESKTOP_ASPECT}
      />
    </form>
  );
}
