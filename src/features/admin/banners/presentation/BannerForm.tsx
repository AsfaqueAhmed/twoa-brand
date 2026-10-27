'use client';

import { useMemo, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import ImageCropperModal from '@/features/admin/inventory/presentation/ImageCropperModal';
import HeroCarousel from '@/features/catalog/presentation/HeroCarousel';
import {
  DEFAULT_DESKTOP_ASPECT,
  DEFAULT_MOBILE_ASPECT,
  DESKTOP_ASPECT_PRESETS,
  MOBILE_ASPECT_PRESETS,
  findAspectPreset,
  isSafeCtaHref,
  isValidDesktopAspect,
  isValidMobileAspect,
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

type Preset = { label: string; value: number };

interface Shape {
  aspect: number;
  custom: boolean;
  w: string;
  h: string;
  preset: Preset | undefined;
  label: string;
  choosePreset: (value: number) => void;
  chooseCustom: () => void;
  updateCustom: (w: string, h: string) => void;
}

// Tracks one aspect ratio: preset vs custom entry. Saved ratios are rounded by
// the DB, so presets are matched with a tolerance. Unparseable custom input
// (empty/0) keeps the last valid ratio instead of producing NaN.
function useShape(initialAspect: number, presets: Preset[]): Shape {
  const [aspect, setAspect] = useState(initialAspect);
  const [custom, setCustom] = useState(() => !findAspectPreset(presets, initialAspect));
  const [w, setW] = useState(() => String(Number(initialAspect.toFixed(2))));
  const [h, setH] = useState('1');

  const updateCustom = (nw: string, nh: string) => {
    setW(nw);
    setH(nh);
    const ratio = Number(nw) / Number(nh);
    if (nw.trim() !== '' && nh.trim() !== '' && Number.isFinite(ratio) && ratio > 0) setAspect(ratio);
  };

  const preset = findAspectPreset(presets, aspect);
  const label = preset ? preset.label : custom ? `${w}:${h}` : String(Number(aspect.toFixed(2)));

  return {
    aspect,
    custom,
    w,
    h,
    preset: custom ? undefined : preset,
    label,
    choosePreset: (value) => {
      setCustom(false);
      setAspect(value);
    },
    chooseCustom: () => {
      setCustom(true);
      updateCustom(w, h);
    },
    updateCustom,
  };
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
  const desktopShape = useShape(initial?.desktopAspect ?? DEFAULT_DESKTOP_ASPECT, DESKTOP_ASPECT_PRESETS);
  const mobileShape = useShape(initial?.mobileAspect ?? DEFAULT_MOBILE_ASPECT, MOBILE_ASPECT_PRESETS);
  const desktopAspect = desktopShape.aspect;
  const mobileAspect = mobileShape.aspect;
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
      mobileAspect: isValidMobileAspect(mobileAspect) ? mobileAspect : DEFAULT_MOBILE_ASPECT,
      createdAt: '',
    }),
    [id, desktopImageUrl, mobileImageUrl, eyebrow, headline, subtext, ctaLabel, ctaHref, desktopAspect, mobileAspect]
  );

  const aspectLabel = desktopShape.label;
  const mobileAspectLabel = mobileShape.label;

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
    if (!isValidMobileAspect(mobileAspect)) {
      setError('Mobile shape must be between 1:2 and 2:1.');
      return;
    }
    if (ctaHref.trim() && !isSafeCtaHref(ctaHref)) {
      setError('Banner link must start with / or https://');
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
      mobileAspect,
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

  const shapeField = (
    label: string,
    key: string,
    shape: Shape,
    presets: Preset[],
    isValid: (n: number) => boolean,
    rangeText: string
  ) => (
    <div>
      <label htmlFor={`${fid}-${key}`} className={labelClass}>{label}</label>
      <select
        id={`${fid}-${key}`}
        className={inputClass}
        value={shape.custom ? 'custom' : String(presets.findIndex((p) => p === shape.preset))}
        onChange={(e) => {
          if (e.target.value === 'custom') shape.chooseCustom();
          else shape.choosePreset(presets[Number(e.target.value)].value);
        }}
      >
        {presets.map((p, i) => (
          <option key={p.label} value={String(i)}>{p.label}</option>
        ))}
        <option value="custom">Custom…</option>
      </select>
      {shape.custom && (
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${fid}-${key}-w`} className={labelClass}>Width</label>
            <input
              id={`${fid}-${key}-w`}
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={shape.w}
              onChange={(e) => shape.updateCustom(e.target.value, shape.h)}
            />
          </div>
          <div>
            <label htmlFor={`${fid}-${key}-h`} className={labelClass}>Height</label>
            <input
              id={`${fid}-${key}-h`}
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={shape.h}
              onChange={(e) => shape.updateCustom(shape.w, e.target.value)}
            />
          </div>
          {(() => {
            const ratio = Number(shape.w) / Number(shape.h);
            const ok = isValid(ratio);
            return (
              <p
                role={ok ? undefined : 'alert'}
                className={`col-span-2 text-[11px] font-semibold ${ok ? 'text-[#717171]' : 'text-red-600'}`}
              >
                {ok
                  ? `Ratio ${ratio.toFixed(2)} : 1`
                  : `${shape.w || '?'} : ${shape.h || '?'} is not allowed (ratio ${
                      Number.isFinite(ratio) ? ratio.toFixed(2) : '?'
                    } : 1). ${rangeText}`}
              </p>
            );
          })()}
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-[#717171]">
        The carousel uses the first banner&apos;s shape; other banners are cropped to fit.
      </p>
    </div>
  );

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
        {shapeField('Desktop shape', 'shape', desktopShape, DESKTOP_ASPECT_PRESETS, isValidDesktopAspect, 'Width ÷ height must be between 1 and 6 (for example 16:6 or 18:4).')}
        {shapeField('Mobile shape', 'mshape', mobileShape, MOBILE_ASPECT_PRESETS, isValidMobileAspect, 'Width ÷ height must be between 0.5 and 2 (for example 4:5 or 1:1).')}
        {imageField('Desktop image', 'desktop', desktopImageUrl, aspectLabel)}
        {imageField('Mobile image (optional)', 'mobile', mobileImageUrl, mobileAspectLabel)}
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
            <label htmlFor={`${fid}-cta-href`} className={labelClass}>Banner link (optional)</label>
            <input
              id={`${fid}-cta-href`}
              className={inputClass}
              placeholder="/ or https://…"
              value={ctaHref}
              onChange={(e) => setCtaHref(e.target.value)}
            />
          </div>
        </div>
        <p className="-mt-2 text-[11px] text-[#717171]">
          Leave the link empty for a banner that isn&apos;t clickable. The button only shows when there is a link.
        </p>
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

      <div className="space-y-5">
        <div>
          <span className={labelClass}>Live preview · Desktop</span>
          {desktopImageUrl ? (
            <div className="border border-[#EEEEEE]">
              <HeroCarousel banners={[preview]} previewMode="desktop" />
            </div>
          ) : (
            <div className="flex aspect-[16/6] items-center justify-center border border-[#EEEEEE] text-xs text-[#919191]">
              Upload a desktop image to preview
            </div>
          )}
        </div>
        <div>
          <span className={labelClass}>Live preview · Mobile</span>
          {desktopImageUrl ? (
            <div className="mx-auto w-full max-w-[375px] border-2 border-black bg-white">
              <HeroCarousel banners={[preview]} previewMode="mobile" />
            </div>
          ) : (
            <div className="mx-auto flex aspect-[4/5] w-full max-w-[375px] items-center justify-center border-2 border-[#EEEEEE] text-xs text-[#919191]">
              Upload an image to preview
            </div>
          )}
          {desktopImageUrl && !mobileImageUrl && (
            <p className="mt-1.5 text-center text-[11px] text-[#717171]">
              No mobile image yet, so phones will show the desktop image cropped to this shape.
            </p>
          )}
        </div>
      </div>

      <ImageCropperModal
        isOpen={cropTarget !== null}
        onClose={() => setCropTarget(null)}
        onCropComplete={handleCropped}
        title={
          cropTarget === 'mobile'
            ? `Crop mobile banner (${mobileAspectLabel})`
            : `Crop desktop banner (${aspectLabel})`
        }
        aspect={cropTarget === 'mobile' ? (isValidMobileAspect(mobileAspect) ? mobileAspect : DEFAULT_MOBILE_ASPECT) : isValidDesktopAspect(desktopAspect) ? desktopAspect : DEFAULT_DESKTOP_ASPECT}
      />
    </form>
  );
}
