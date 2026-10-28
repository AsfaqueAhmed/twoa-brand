import { LayoutGrid, List } from 'lucide-react';
import DropdownMenu from '@/features/admin/presentation/ui/DropdownMenu';

export type ProductViewMode = 'list' | 'grid';

type Props = {
  selectedCount: number;
  allOnPageSelected: boolean;
  someOnPageSelected: boolean;
  onToggleAllOnPage: () => void;
  onEdit: () => void;
  onChangeCategory: () => void;
  onUpdateStock: () => void;
  onChangeStatus: (active: boolean) => void;
  onDelete: () => void;
  viewMode: ProductViewMode;
  onViewMode: (m: ProductViewMode) => void;
  busy: boolean;
  children?: React.ReactNode; // right-hand content (pagination)
};

export default function ProductBulkToolbar(p: Props) {
  const none = p.selectedCount === 0 || p.busy;
  const btn =
    'rounded-lg border border-[#EEEEEE] bg-white px-3.5 py-2 text-sm text-black hover:border-black disabled:cursor-not-allowed disabled:text-[#A1A1A1] disabled:hover:border-[#EEEEEE]';
  const seg = (active: boolean) => `rounded-md p-2 ${active ? 'bg-black text-white' : 'text-[#555555] hover:text-black'}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEEEEE] px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="checkbox"
          aria-label="Select all products on this page"
          checked={p.allOnPageSelected}
          ref={(el) => {
            if (el) el.indeterminate = p.someOnPageSelected && !p.allOnPageSelected;
          }}
          onChange={p.onToggleAllOnPage}
          className="mr-1 h-4 w-4 accent-black"
        />
        <span className="mr-2 text-sm text-[#555555]">{p.selectedCount} selected</span>
        <button type="button" className={btn} disabled={p.selectedCount !== 1 || p.busy} onClick={p.onEdit}>Edit</button>
        <button type="button" className={btn} disabled={none} onClick={p.onChangeCategory}>Change Category</button>
        <button type="button" className={btn} disabled={none} onClick={p.onUpdateStock}>Update Stock</button>
        <DropdownMenu
          label="Change Status"
          disabled={none}
          items={[
            { label: 'Set Active', onSelect: () => p.onChangeStatus(true) },
            { label: 'Set Inactive', onSelect: () => p.onChangeStatus(false) },
          ]}
        />
        <DropdownMenu label="More" disabled={none} items={[{ label: 'Delete selected', danger: true, onSelect: p.onDelete }]} />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-[#EEEEEE] bg-[#FAF9F6] p-1" role="group" aria-label="View mode">
          <button type="button" aria-label="List view" aria-pressed={p.viewMode === 'list'} className={seg(p.viewMode === 'list')} onClick={() => p.onViewMode('list')}>
            <List className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Grid view" aria-pressed={p.viewMode === 'grid'} className={seg(p.viewMode === 'grid')} onClick={() => p.onViewMode('grid')}>
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
        {p.children}
      </div>
    </div>
  );
}
