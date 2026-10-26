'use client';

import { useMemo, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import ImageCropperModal from '@/features/admin/inventory/presentation/ImageCropperModal';
import HeroCarousel from '@/features/catalog/presentation/HeroCarousel';
import { isSafeCtaHref, type HomeBanner } from '@/features/catalog/domain/banner';
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

export default function BannerForm({ initial, nextPosition, onSaved, onCancel }: BannerFormProps) {
  // A new banner needs its id up front so images can be uploaded to banners/<id>-*.
  const [id] = useState(() => initial?.id ?? crypto.randomUUID());
  const [desktopImageUrl, setDesktopImageUrl] = useState(initial?.desktopImageUrl ?? '');
  const [mobileImageUrl, setMobileImageUrl] = useState(initial?.mobileImageUrl ?? '');
  const [eyebrow, setEyebrow] = useState(initial?.eyebrow ?? '');
  const [headline, setHeadline] = useState(initial?.headline ?? '');
  const [subtext, setSubtext] = useState(initial?.subtext ?? '');
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? '');
  const [ctaHref, setCtaHref] = useState(initial?.ctaHref ?? '');
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
      createdAt: '',
    }),
    [id, desktopImageUrl, mobileImageUrl, eyebrow, headline, subtext, ctaLabel, ctaHref]
  );

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
    if (ctaHref.trim() && !isSafeCtaHref(ctaHref)) {
      setError('Button link must start with / or https://');
      return;
    }
    setBusy(true);
    setError('');
    const payload = {
      isActive: initial?.isActive ?? true,
      desktopImageUrl,
      mobileImageUrl: mobileImageUrl || undefined,
      eyebrow: eyebrow.trim(),
      headline: headline.trim(),
      subtext: subtext.trim(),
      ctaLabel: ctaLabel.trim(),
      ctaHref: ctaHref.trim(),
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
      else await createBanner(id, payload, nextPosition);
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
        {imageField('Desktop image', 'desktop', desktopImageUrl, '16:6')}
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
            <label htmlFor={`${fid}-cta-label`} className={labelClass}>Button label</label>
            <input id={`${fid}-cta-label`} className={inputClass} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`${fid}-cta-href`} className={labelClass}>Button link</label>
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
        title={cropTarget === 'mobile' ? 'Crop mobile banner (4:5)' : 'Crop desktop banner (16:6)'}
        aspect={cropTarget === 'mobile' ? 4 / 5 : 16 / 6}
      />
    </form>
  );
}
