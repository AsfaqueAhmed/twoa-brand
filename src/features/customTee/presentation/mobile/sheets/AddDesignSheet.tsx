'use client';

import { useRef, useState } from 'react';
import {
  ChevronRight,
  HardDrive,
  LayoutGrid,
  UploadCloud,
} from 'lucide-react';
import type { Asset } from '../../../application/useStudioState';
import FreeGallerySheet from './FreeGallerySheet';

type SubTab = 'upload' | 'gallery' | 'my-designs';

type Props = {
  assets: Asset[];
  onUploadFiles: (files: FileList | null) => void;
  onSelectAsset: (asset: Asset) => void;
  onSelectArtwork: (artwork: { name: string; src: string; aspect: number }) => void;
  uploading?: boolean;
  uploadError?: string | null;
  initialSubTab?: SubTab;
};

export default function AddDesignSheet({
  assets,
  onUploadFiles,
  onSelectAsset,
  onSelectArtwork,
  uploading = false,
  uploadError = null,
  initialSubTab = 'upload',
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        multiple
        className="hidden"
        onChange={(e) => {
          onUploadFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Sub Tabs Pill Navigation */}
      <div className="flex rounded-full bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setSubTab('upload')}
          className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${
            subTab === 'upload' ? 'bg-black text-white shadow-xs' : 'text-zinc-600 hover:text-black'
          }`}
        >
          Upload
        </button>
        <button
          type="button"
          onClick={() => setSubTab('gallery')}
          className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${
            subTab === 'gallery' ? 'bg-black text-white shadow-xs' : 'text-zinc-600 hover:text-black'
          }`}
        >
          Free Gallery
        </button>
        <button
          type="button"
          onClick={() => setSubTab('my-designs')}
          className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${
            subTab === 'my-designs' ? 'bg-black text-white shadow-xs' : 'text-zinc-600 hover:text-black'
          }`}
        >
          My Designs ({assets.length})
        </button>
      </div>

      {uploadError && (
        <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">
          {uploadError}
        </div>
      )}

      {/* Upload View */}
      {subTab === 'upload' && (
        <div className="space-y-5 pb-6">
          {/* Drag & Drop Zone */}
          <div
            onClick={triggerFileInput}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') triggerFileInput();
            }}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/70 p-6 text-center cursor-pointer hover:border-black hover:bg-zinc-100/50 transition active:scale-99"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xs text-black">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="mt-3 text-xs font-bold text-zinc-900">
              Drag & drop your image here or <span className="underline">click to upload</span>
            </p>
            <p className="mt-1 text-[11px] font-medium text-zinc-400">
              Supports JPG, PNG, WebP (Max 10MB)
            </p>
            {uploading && (
              <p className="mt-2 text-xs font-bold text-indigo-600 animate-pulse">Uploading image...</p>
            )}
          </div>

          {/* Recent Uploads Section */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">Recent Uploads</h3>
              {assets.length > 4 && (
                <button
                  type="button"
                  onClick={() => setSubTab('my-designs')}
                  className="text-xs font-bold text-zinc-600 hover:text-black"
                >
                  See All
                </button>
              )}
            </div>

            {assets.length === 0 ? (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-center text-xs text-zinc-400">
                No uploads yet. Upload an image above or pick from the Free Gallery.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2.5">
                {assets.slice(0, 4).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelectAsset(a)}
                    className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 p-1 hover:border-black active:scale-95 transition"
                  >
                    <img src={a.src} alt={a.name} className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Source Options List */}
          <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 overflow-hidden bg-white">
            <button
              type="button"
              onClick={triggerFileInput}
              className="flex w-full items-center justify-between p-3.5 text-left hover:bg-zinc-50 active:bg-zinc-100 transition"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  <HardDrive className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-zinc-900">From Device</span>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={() => setSubTab('gallery')}
              className="flex w-full items-center justify-between p-3.5 text-left hover:bg-zinc-50 active:bg-zinc-100 transition"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <LayoutGrid className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-zinc-900">Browse Gallery</span>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </button>
          </div>
        </div>
      )}

      {/* Free Gallery View */}
      {subTab === 'gallery' && (
        <FreeGallerySheet onSelectArtwork={onSelectArtwork} />
      )}

      {/* My Designs View */}
      {subTab === 'my-designs' && (
        <div className="space-y-4 pb-6">
          {assets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-500">
              No saved designs yet. Upload an image to start!
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {assets.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelectAsset(a)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2.5 text-left shadow-2xs hover:border-black transition active:scale-98"
                >
                  <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-zinc-100 group-hover:scale-102 transition-transform">
                    <img src={a.src} alt={a.name} className="h-full w-full object-contain" />
                  </div>
                  <span className="mt-2 block truncate text-xs font-bold text-zinc-900">{a.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
