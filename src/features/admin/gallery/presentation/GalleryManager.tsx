'use client';

import { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, RefreshCw } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import ErrorBanner from '@/features/admin/presentation/ui/ErrorBanner';
import EmptyState from '@/shared/ui/EmptyState';
import { distinctCategories, nextSortOrder, type AdminGalleryItem } from '../domain/galleryAdmin';
import {
  deleteGalleryItem,
  listGalleryItems,
  updateGalleryItem,
  type GalleryItemPatch,
} from '../infrastructure/galleryAdminRepository';
import GalleryUploadForm from './GalleryUploadForm';
import GalleryItemCard from './GalleryItemCard';

export default function GalleryManager() {
  const [items, setItems] = useState<AdminGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setItems(await listGalleryItems());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the gallery.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async (item: AdminGalleryItem, patch: GalleryItemPatch) => {
    setBusyId(item.id);
    try {
      await updateGalleryItem(item.id, patch);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update artwork.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: AdminGalleryItem) => {
    if (!window.confirm(`Delete "${item.title}" from the gallery? This cannot be undone.`)) return;
    setBusyId(item.id);
    try {
      await deleteGalleryItem(item);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete artwork.');
    } finally {
      setBusyId(null);
    }
  };

  const categories = distinctCategories(items);
  const live = items.filter((i) => i.active).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Gallery" subtitle="Free artwork customers can add in the custom tee studio. Lower sort order shows first." />

      {error && <ErrorBanner message={error} onRetry={refresh} onDismiss={items.length > 0 ? () => setError('') : undefined} />}

      <GalleryUploadForm categories={categories} firstSortOrder={nextSortOrder(items)} onUploaded={refresh} />

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#EEEEEE] py-16">
          <RefreshCw className="h-5 w-5 animate-spin text-[#717171]" />
          <p className="mt-3 text-xs font-semibold text-[#717171]">Loading gallery...</p>
        </div>
      ) : items.length === 0 ? (
        !error && <EmptyState icon={ImageIcon} title="No artwork yet" description="Upload images above to fill the Free Gallery." />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[#717171]">
            {items.length} artwork{items.length === 1 ? '' : 's'} · {live} live · {items.length - live} hidden
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {items.map((item) => (
              <GalleryItemCard key={item.id} item={item} busy={busyId === item.id} onSave={handleSave} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
