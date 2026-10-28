'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import type { ParentImage } from '@/shared/domain/types';
import {
  IMAGE_TITLE_SUGGESTIONS,
  MAX_IMAGE_TITLE_LENGTH,
  MAX_PARENT_IMAGES,
  nextImageTitle,
} from '@/features/catalog/domain/parentImages';

type Props = {
  images: ParentImage[];
  onChange: (images: ParentImage[]) => void;
  onUpload: () => void;
  uploading: boolean;
};

const LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-1.5';
const INPUT = 'rounded-none border border-[#EEEEEE] bg-white py-2 px-3 text-xs text-black focus:border-black focus:outline-none';
const ICON_BTN = 'flex h-8 w-8 shrink-0 items-center justify-center border border-[#EEEEEE] text-[#717171] hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-30';
const PRIMARY_BTN = 'bg-black hover:bg-[#333333] text-white text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 transition-colors flex items-center justify-center space-x-1.5 shrink-0 disabled:bg-[#717171] disabled:cursor-not-allowed';

export default function ParentImagesField({ images, onChange, onUpload, uploading }: Props) {
  const [url, setUrl] = useState('');
  const full = images.length >= MAX_PARENT_IMAGES;

  const setTitle = (i: number, title: string) => onChange(images.map((img, idx) => (idx === i ? { ...img, title } : img)));
  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = images.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const addUrl = () => {
    const trimmed = url.trim();
    if (!trimmed || full) return;
    onChange([...images, { title: nextImageTitle(images), url: trimmed }]);
    setUrl('');
  };

  return (
    <div>
      <span className={LABEL}>
        Images ({images.length}/{MAX_PARENT_IMAGES}) — the first is the primary image
      </span>

      <datalist id="parent-image-titles">
        {IMAGE_TITLE_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {images.length > 0 && (
        <ul className="mb-3 space-y-2">
          {images.map((img, i) => (
            <li key={`${img.url}-${i}`} className="flex items-center gap-3 border border-[#EEEEEE] bg-[#FAF9F6] p-2.5">
              <img
                src={img.url}
                alt={img.title || `Image ${i + 1}`}
                className="h-14 w-14 shrink-0 border border-[#EEEEEE] object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Invalid+Image';
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <input
                    aria-label={`Title for image ${i + 1}`}
                    list="parent-image-titles"
                    value={img.title}
                    maxLength={MAX_IMAGE_TITLE_LENGTH}
                    placeholder={`Image ${i + 1}`}
                    onChange={(e) => setTitle(i, e.target.value)}
                    className={`${INPUT} w-full max-w-[220px]`}
                  />
                  {i === 0 && (
                    <span className="bg-black px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-white">Primary</span>
                  )}
                </div>
                <p className="mt-1 truncate font-mono text-[10px] text-[#717171]">{img.url}</p>
              </div>
              <button type="button" aria-label="Move image up" disabled={i === 0} onClick={() => move(i, -1)} className={ICON_BTN}>
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Move image down" disabled={i === images.length - 1} onClick={() => move(i, 1)} className={ICON_BTN}>
                <ArrowDown className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Remove image" onClick={() => remove(i)} className={`${ICON_BTN} hover:!border-red-600 hover:!text-red-600`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={url}
          disabled={full}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder={full ? 'Maximum images reached' : 'Paste an image URL'}
          className={`${INPUT} flex-1 py-2.5`}
        />
        <button type="button" onClick={addUrl} disabled={full || !url.trim()} className={PRIMARY_BTN}>
          <Plus className="h-3.5 w-3.5" />
          <span>Add URL</span>
        </button>
        <button type="button" onClick={onUpload} disabled={full || uploading} className={PRIMARY_BTN}>
          {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          <span>{uploading ? 'Uploading…' : 'Upload & Crop'}</span>
        </button>
      </div>
    </div>
  );
}
