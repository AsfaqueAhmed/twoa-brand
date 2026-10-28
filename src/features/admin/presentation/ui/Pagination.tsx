import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = { from: number; to: number; total: number; page: number; totalPages: number; onPage: (p: number) => void; id?: string };

export default function Pagination({ from, to, total, page, totalPages, onPage, id }: Props) {
  const btn = 'rounded-lg border border-[#EEEEEE] bg-white p-2 text-black hover:border-black disabled:opacity-40 disabled:hover:border-[#EEEEEE]';
  return (
    <div className="flex items-center gap-3" id={id}>
      <span className="whitespace-nowrap text-xs text-[#717171]">
        Showing {from}-{to} of {total}
      </span>
      <button type="button" aria-label="Previous page" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Next page" className={btn} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
