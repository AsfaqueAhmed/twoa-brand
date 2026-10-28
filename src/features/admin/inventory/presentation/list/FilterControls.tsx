import { ChevronDown } from 'lucide-react';

const SELECT =
  'h-10 w-full cursor-pointer appearance-none rounded-lg border border-[#EEEEEE] bg-white pl-3.5 pr-9 text-xs font-semibold text-black focus:border-black focus:outline-none';
export const FILTER_CONTROL =
  'inline-flex h-10 items-center gap-2 rounded-lg border border-[#EEEEEE] bg-white px-3.5 text-xs font-semibold text-black';

// Native <select> with the browser arrow removed so the chevron gets the same
// inner padding on the right as the label has on the left.
export function FilterSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative min-w-[9.5rem]">
      <select {...props} className={SELECT}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
    </div>
  );
}
