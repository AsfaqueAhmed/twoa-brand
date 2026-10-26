'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { nextBannerPosition, renumberBanners, type HomeBanner } from '@/features/catalog/domain/banner';
import {
  deleteBanner,
  listAllBanners,
  saveBannerOrder,
  updateBanner,
} from '../infrastructure/bannerAdminRepository';
import BannerForm from './BannerForm';

interface BannerRowProps {
  banner: HomeBanner;
  busy: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onToggle: (banner: HomeBanner) => void;
  onEdit: (banner: HomeBanner) => void;
  onDelete: (banner: HomeBanner) => void;
}

function BannerRow({ banner, busy, onDragStart, onDragEnd, onToggle, onEdit, onDelete }: BannerRowProps) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={banner}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="flex items-center gap-3 border border-[#EEEEEE] bg-white p-3"
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        onPointerDown={(e) => controls.start(e)}
        className="shrink-0 cursor-grab touch-none text-[#919191]"
      >
        <GripVertical className="h-5 w-5" aria-hidden="true" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.desktopImageUrl} alt="" className="h-12 w-28 shrink-0 border border-[#EEEEEE] object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-black">{banner.headline || 'Untitled banner'}</p>
        <p className="truncate text-xs text-[#717171]">{banner.subtext}</p>
      </div>
      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#717171]">
        <input type="checkbox" checked={banner.isActive} disabled={busy} onChange={() => onToggle(banner)} />
        Active
      </label>
      <button type="button" aria-label="Edit banner" disabled={busy} onClick={() => onEdit(banner)} className="p-2 text-[#717171] hover:text-black disabled:opacity-50">
        <Pencil className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Delete banner" disabled={busy} onClick={() => onDelete(banner)} className="p-2 text-[#717171] hover:text-red-600 disabled:opacity-50">
        <Trash2 className="h-4 w-4" />
      </button>
    </Reorder.Item>
  );
}

const sameOrder = (a: HomeBanner[], b: HomeBanner[]) =>
  a.length === b.length && a.every((x, i) => x.id === b[i].id);

export default function BannerManager() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const bannersRef = useRef<HomeBanner[]>([]);
  const orderAtDragStartRef = useRef<HomeBanner[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<HomeBanner | 'new' | null>(null);

  bannersRef.current = banners;

  const refresh = useCallback(async () => {
    try {
      setBanners(await listAllBanners());
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load banners.');
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Persist the order after a drag ends; on failure reload the saved order.
  const persistOrder = async (ordered: HomeBanner[]) => {
    const renumbered = renumberBanners(ordered);
    setBanners(renumbered);
    try {
      await saveBannerOrder(renumbered);
    } catch (err: any) {
      const message = err.message || 'Failed to save order.';
      await refresh();
      setError(message);
    }
  };

  const handleToggle = async (banner: HomeBanner) => {
    setBusyId(banner.id);
    try {
      await updateBanner(banner.id, { isActive: !banner.isActive });
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update banner.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (banner: HomeBanner) => {
    if (!window.confirm(`Delete banner "${banner.headline || 'Untitled'}"? This cannot be undone.`)) return;
    setBusyId(banner.id);
    try {
      await deleteBanner(banner);
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete banner.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div id="banner-manager">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-sm font-bold uppercase tracking-wider text-black">Home Banners</h1>
        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="flex h-10 items-center gap-2 bg-black px-5 text-[11px] font-bold uppercase tracking-[0.15em] text-white hover:bg-[#333333]"
          >
            <Plus className="h-4 w-4" /> Add banner
          </button>
        )}
      </div>

      {error && <p role="alert" className="mb-4 text-xs font-semibold text-red-600">{error}</p>}

      {editing !== null && (
        <BannerForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          nextPosition={nextBannerPosition(banners)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {initialLoading ? (
        <p className="text-xs text-[#717171]">Loading…</p>
      ) : banners.length === 0 ? (
        <p className="text-xs text-[#717171]">No banners yet. Add one to show a hero carousel on the home page.</p>
      ) : (
        <>
          <p className="mb-3 text-[11px] text-[#717171]">Drag the handle to reorder. Only active banners show on the home page.</p>
          <Reorder.Group axis="y" values={banners} onReorder={setBanners} className="space-y-2">
            {banners.map((banner) => (
              <BannerRow
                key={banner.id}
                banner={banner}
                busy={busyId === banner.id}
                onDragStart={() => {
                  orderAtDragStartRef.current = bannersRef.current;
                }}
                onDragEnd={() => {
                  const current = bannersRef.current;
                  if (sameOrder(current, orderAtDragStartRef.current)) return;
                  orderAtDragStartRef.current = current;
                  persistOrder(current);
                }}
                onToggle={handleToggle}
                onEdit={setEditing}
                onDelete={handleDelete}
              />
            ))}
          </Reorder.Group>
        </>
      )}
    </div>
  );
}
