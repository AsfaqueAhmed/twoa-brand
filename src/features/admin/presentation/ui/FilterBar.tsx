import { Filter } from 'lucide-react';
import { FILTER_CONTROL } from './FilterControls';

type Props = { activeCount: number; onReset: () => void; children: React.ReactNode };

// Card wrapper laying out filter controls in a wrapping row, followed by the
// standard "Filter" indicator (with active-count badge) and Reset button.
export default function FilterBar({ activeCount, onReset, children }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#EEEEEE] bg-[#FAF9F6] p-4">
      {children}
      <span className={FILTER_CONTROL}>
        <Filter className="h-3.5 w-3.5" />
        Filter{activeCount > 0 && <span className="rounded-full bg-black px-1.5 text-[10px] text-white">{activeCount}</span>}
      </span>
      <button type="button" onClick={onReset} disabled={activeCount === 0} className={`${FILTER_CONTROL} hover:border-black disabled:opacity-40`}>
        Reset
      </button>
    </div>
  );
}
