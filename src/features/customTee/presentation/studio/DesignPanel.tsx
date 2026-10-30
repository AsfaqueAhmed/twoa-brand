'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import type { GalleryAsset } from '../../application/galleryArtwork';
import GalleryPanel from './GalleryPanel';

type Props = {
  onFiles: (files: FileList | null) => void;
  onGalleryArtwork: (asset: GalleryAsset) => void;
  busy: boolean;
  error: string | null;
};

type Tab = 'upload' | 'gallery';

const TAB = 'rounded-md px-3 py-2 text-[11px] font-bold uppercase tracking-wider';

export default function DesignPanel({ onFiles, onGalleryArtwork, busy, error }: Props) {
  const [tab, setTab] = useState<Tab>('upload');
  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <h2 className="text-sm font-bold uppercase tracking-widest text-black">Add Design</h2>

      <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#EEEEEE] p-1">
        <button
          type="button"
          aria-pressed={tab === 'upload'}
          onClick={() => setTab('upload')}
          className={`${TAB} ${tab === 'upload' ? 'bg-black text-white' : 'text-[#717171] hover:text-black'}`}
        >
          Upload
        </button>
        <button
          type="button"
          aria-pressed={tab === 'gallery'}
          onClick={() => setTab('gallery')}
          className={`${TAB} ${tab === 'gallery' ? 'bg-black text-white' : 'text-[#717171] hover:text-black'}`}
        >
          Free Gallery
        </button>
      </div>

      {tab === 'gallery' ? (
        <GalleryPanel onAdd={onGalleryArtwork} />
      ) : (
        <>
          <label
            htmlFor="artwork-file"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFiles(e.dataTransfer.files);
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#CDCDCD] px-4 py-10 text-center text-xs text-[#717171] hover:border-black"
          >
            <Upload className="h-6 w-6 text-black" />
            <span>Drag &amp; drop your image here</span>
            <span>or click to upload</span>
            <span className="text-[10px]">Supports JPG, PNG, WebP (Max 10MB)</span>
          </label>
          <input
            id="artwork-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {busy && <p className="text-xs text-[#717171]">Processing image…</p>}
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
