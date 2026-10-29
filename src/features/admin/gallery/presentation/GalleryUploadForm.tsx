'use client';

import { useState } from 'react';
import { RefreshCw, Upload } from 'lucide-react';
import { normalizeCategory, titleFromFileName, validateGalleryFile } from '../domain/galleryAdmin';
import { createGalleryItem } from '../infrastructure/galleryAdminRepository';

type Props = {
  categories: string[];
  firstSortOrder: number;
  onUploaded: () => Promise<void> | void;
};

const INPUT = 'w-full rounded-lg border border-[#EEEEEE] px-3 py-2.5 text-sm text-black focus:border-black focus:outline-none';

// Natural pixel ratio (width / height) of an image file.
function readAspect(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  return new Promise<number>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / Math.max(1, img.naturalHeight));
    img.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    img.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

export default function GalleryUploadForm({ categories, firstSortOrder, onUploaded }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || busy) return;
    setBusy(true);
    const problems: string[] = [];
    let uploaded = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Uploading ${i + 1} of ${files.length}…`);
        const invalid = validateGalleryFile(file);
        if (invalid) {
          problems.push(`${file.name}: ${invalid}`);
          continue;
        }
        try {
          const aspect = await readAspect(file);
          await createGalleryItem({
            file,
            title: titleFromFileName(file.name),
            category: normalizeCategory(category),
            aspect,
            sortOrder: firstSortOrder + uploaded,
          });
          uploaded++;
        } catch (err) {
          problems.push(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed.'}`);
        }
      }
    } finally {
      setErrors(problems);
      setProgress('');
      setBusy(false);
      if (problems.length === 0) setFiles([]);
      if (uploaded > 0) await onUploaded();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-[#EEEEEE] bg-white p-5">
      <h2 className="text-sm font-bold text-black">Upload artwork</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-[#717171]">Images (PNG, JPG or WebP, up to 5 MB each)</span>
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(e) => {
              setFiles(Array.from(e.target.files ?? []));
              setErrors([]);
              e.target.value = '';
            }}
            className="block w-full text-sm text-[#717171] file:mr-3 file:rounded-lg file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-[#717171]">Category</span>
          <input
            list="gallery-categories"
            value={category}
            disabled={busy}
            maxLength={40}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="General"
            className={INPUT}
          />
          <datalist id="gallery-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      </div>

      {files.length > 0 && (
        <ul className="space-y-1 text-xs text-[#717171]">
          {files.map((f) => (
            <li key={`${f.name}-${f.size}`} className="truncate">
              {f.name} <span className="text-[#919191]">({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
              {validateGalleryFile(f) && <span className="ml-2 text-red-600">{validateGalleryFile(f)}</span>}
            </li>
          ))}
        </ul>
      )}

      {errors.length > 0 && (
        <div role="alert" className="space-y-1 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {errors.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || files.length === 0}
          className="flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {files.length > 1 ? `Upload ${files.length} images` : 'Upload'}
        </button>
        {progress && <span className="text-xs text-[#717171]">{progress}</span>}
      </div>
    </form>
  );
}
