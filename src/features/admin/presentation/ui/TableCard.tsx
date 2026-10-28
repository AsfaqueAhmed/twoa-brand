// Table building blocks. Class constants keep headers/rows consistent across screens.
export const TABLE_HEAD_ROW = 'border-b border-[#EEEEEE] bg-[#FAF9F6] text-xs font-medium text-[#555555]';
export const TABLE_BODY = 'divide-y divide-[#EEEEEE] text-sm text-[#1A1A1A]';
export const TABLE_ROW = 'transition-colors hover:bg-[#FAF9F6]/60';
export const TH = 'px-3 py-3.5';

/** Rounded white card that holds an optional toolbar plus a table. */
export function TableCard({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-[#EEEEEE] bg-white">{children}</div>;
}

/** Horizontally scrolling <table> with the standard header row; pass min-width class via `minWidth`. */
export function TableScroll({ minWidth = 'min-w-[860px]', head, children }: { minWidth?: string; head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${minWidth} border-collapse text-left`}>
        <thead>
          <tr className={TABLE_HEAD_ROW}>{head}</tr>
        </thead>
        <tbody className={TABLE_BODY}>{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return <th className={`${TH} ${className}`.trim()}>{children}</th>;
}
