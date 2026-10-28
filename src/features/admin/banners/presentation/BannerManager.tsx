'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, EyeOff, Image as ImageIcon, Link2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { nextBannerPosition, reorderBanners, type HomeBanner } from '@/features/catalog/domain/banner';
import {
  deleteBanner,
  listAllBanners,
  saveBannerOrder,
  updateBanner,
} from '../infrastructure/bannerAdminRepository';
import {
  DEFAULT_BANNER_FILTERS,
  activeBannerFilterCount,
  bannerStats,
  filterBanners,
  hasBannerLink,
  type BannerFilters,
  type BannerStatusFilter,
} from '../domain/bannerList';
import BannerForm from './BannerForm';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import { paginate } from '@/features/admin/inventory/domain/productList';
import StatCard from '@/features/admin/presentation/ui/StatCard';
import StatsRow from '@/features/admin/presentation/ui/StatsRow';
import FilterBar from '@/features/admin/presentation/ui/FilterBar';
import { FilterSearch, FilterSelect } from '@/features/admin/presentation/ui/FilterControls';
import StatusPill from '@/features/admin/presentation/ui/StatusPill';
import ErrorBanner from '@/features/admin/presentation/ui/ErrorBanner';
import Pagination from '@/features/admin/presentation/ui/Pagination';
import { TABLE_ROW, TableCard, TableScroll, Th } from '@/features/admin/presentation/ui/TableCard';
import EmptyState from '@/shared/ui/EmptyState';

const PAGE_SIZE = 20;
const ICON_BTN =
  'rounded-lg border border-[#EEEEEE] bg-white p-2 text-black transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#EEEEEE]';

export default function BannerManager() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<HomeBanner | 'new' | null>(null);
  const [filters, setFilters] = useState<BannerFilters>(DEFAULT_BANNER_FILTERS);
  const [page, setPage] = useState(1);
  const [reordering, setReordering] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [error]);
  const bannersRef = useRef<HomeBanner[]>([]);
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

  // Move a banner one slot in the full list and persist; on failure reload the saved order.
  const handleMove = async (banner: HomeBanner, delta: -1 | 1) => {
    const from = bannersRef.current.findIndex((b) => b.id === banner.id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= bannersRef.current.length) return;
    const reordered = reorderBanners(bannersRef.current, from, to);
    setBanners(reordered);
    setReordering(true);
    try {
      await saveBannerOrder(reordered);
    } catch (err: any) {
      const message = err.message || 'Failed to save order.';
      await refresh();
      setError(message);
    } finally {
      setReordering(false);
    }
  };

  const handleToggle = async (banner: HomeBanner) => {
    if (reordering) return;
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
    if (reordering) return;
    if (!window.confirm(`Delete banner "${banner.headline || 'Untitled'}"? This cannot be undone.`)) return;
    setBusyId(banner.id);
    try {
      await deleteBanner(banner);
      if (editing !== null && editing !== 'new' && editing.id === banner.id) setEditing(null);
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete banner.');
    } finally {
      setBusyId(null);
    }
  };

  const anyBusy = busyId !== null || reordering;
  const hasData = banners.length > 0;
  const failedEmpty = !!error && !hasData && !initialLoading;
  const stats = bannerStats(banners);
  const activeCount = activeBannerFilterCount(filters);
  const visible = filterBanners(banners, filters);
  const pageData = paginate(visible, page, PAGE_SIZE);
  const canReorder = activeCount === 0;
  const updateFilters = (f: BannerFilters) => {
    setFilters(f);
    setPage(1);
  };

  return (
    <div id="banner-manager" className="space-y-6">
      <AdminPageHeader
        title="Banners"
        subtitle="Manage the banners shown on the home page."
        actions={
          editing === null ? (
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333333]"
              id="admin-add-banner-btn"
            >
              <Plus className="h-4 w-4" /> Add banner
            </button>
          ) : undefined
        }
      />

      {!initialLoading && !failedEmpty && (
      <StatsRow>
        <StatCard icon={<ImageIcon className="h-5 w-5" />} label="Total banners" value={stats.total} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Live" value={stats.live} tone="green" caption="shown on home page" />
        <StatCard icon={<EyeOff className="h-5 w-5" />} label="Hidden" value={stats.hidden} tone="gray" caption="inactive" />
        <StatCard icon={<Link2 className="h-5 w-5" />} label="With a link" value={stats.withLink} />
      </StatsRow>
      )}

      {error && !(hasData && dismissed) && (
        <ErrorBanner message={error} onRetry={refresh} onDismiss={hasData ? () => setDismissed(true) : undefined} />
      )}

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

      {!failedEmpty && (
      <FilterBar activeCount={activeCount} onReset={() => updateFilters(DEFAULT_BANNER_FILTERS)}>
        <FilterSearch
          id="admin-banner-search"
          value={filters.search}
          onChange={(search) => updateFilters({ ...filters, search })}
          placeholder="Search by title..."
        />
        <FilterSelect
          aria-label="Status"
          value={filters.status}
          onChange={(e) => updateFilters({ ...filters, status: e.target.value as BannerStatusFilter })}
        >
          <option value="">Status: All</option>
          <option value="live">Live</option>
          <option value="hidden">Hidden</option>
        </FilterSelect>
      </FilterBar>
      )}

      {failedEmpty ? null : initialLoading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#EEEEEE] py-16">
          <RefreshCw className="h-5 w-5 animate-spin text-[#717171]" />
          <p className="mt-3 text-xs font-semibold text-[#717171]">Loading banners...</p>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={banners.length === 0 ? 'No banners yet' : 'No banners found'}
          description={
            banners.length === 0
              ? 'Add one to show a hero carousel on the home page.'
              : 'Try changing or resetting the filters.'
          }
        />
      ) : (
        <TableCard>
          <div className="flex items-center justify-between gap-3 border-b border-[#EEEEEE] px-5 py-3">
            <span className="text-xs text-[#717171]">
              {canReorder ? 'Use the arrows to reorder. Only live banners show on the home page.' : 'Reset filters to reorder banners.'}
            </span>
            <Pagination
              from={pageData.from}
              to={pageData.to}
              total={pageData.total}
              page={pageData.page}
              totalPages={pageData.totalPages}
              onPage={setPage}
            />
          </div>
          <TableScroll
            minWidth="min-w-[860px]"
            head={
              <>
                <Th className="pl-5">Preview</Th>
                <Th>Title</Th>
                <Th>Link</Th>
                <Th>Position</Th>
                <Th>Status</Th>
                <Th className="pr-5 text-right">Actions</Th>
              </>
            }
          >
            {pageData.items.map((banner) => {
              const index = banners.findIndex((b) => b.id === banner.id);
              const busy = busyId === banner.id;
              return (
                <tr key={banner.id} className={TABLE_ROW}>
                  <td className="py-3 pl-5 pr-3">
                    {banner.desktopImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={banner.desktopImageUrl}
                        alt=""
                        style={{ aspectRatio: banner.desktopAspect > 0 ? banner.desktopAspect : 16 / 6 }}
                        className="h-14 max-w-40 rounded-lg border border-[#EEEEEE] object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-28 items-center justify-center rounded-lg border border-[#EEEEEE] bg-[#FAF9F6] text-[#919191]">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </td>
                  <td className="max-w-xs px-3 py-3">
                    <div className="truncate font-semibold text-black">{banner.headline || 'Untitled banner'}</div>
                    {banner.subtext && <div className="truncate text-xs text-[#717171]">{banner.subtext}</div>}
                  </td>
                  <td className="max-w-[14rem] px-3 py-3">
                    {hasBannerLink(banner) ? (
                      <span className="block truncate font-mono text-xs text-[#555555]" title={banner.ctaHref}>
                        {banner.ctaHref}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-3 font-mono">{index + 1}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleToggle(banner)}
                      title={banner.isActive ? 'Click to hide' : 'Click to show'}
                      className="disabled:opacity-50"
                    >
                      <StatusPill tone={banner.isActive ? 'green' : 'gray'}>{banner.isActive ? 'Live' : 'Hidden'}</StatusPill>
                    </button>
                  </td>
                  <td className="px-3 py-3 pr-5">
                    <div className="flex items-center justify-end gap-1.5">
                      {canReorder && (
                        <>
                          <button type="button" aria-label="Move up" title="Move up" className={ICON_BTN} disabled={anyBusy || index <= 0} onClick={() => handleMove(banner, -1)}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" aria-label="Move down" title="Move down" className={ICON_BTN} disabled={anyBusy || index >= banners.length - 1} onClick={() => handleMove(banner, 1)}>
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      <button type="button" aria-label="Edit banner" title="Edit banner" disabled={busy} onClick={() => setEditing(banner)} className={ICON_BTN}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete banner"
                        title="Delete banner"
                        disabled={busy}
                        onClick={() => handleDelete(banner)}
                        className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </TableScroll>
        </TableCard>
      )}
    </div>
  );
}
