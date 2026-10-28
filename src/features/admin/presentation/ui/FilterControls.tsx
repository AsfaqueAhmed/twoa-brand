import { ChevronDown, Search } from 'lucide-react';

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

type SearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
};

export function FilterSearch({ value, onChange, placeholder = 'Search...', id, ariaLabel }: SearchProps) {
  return (
    <div className="relative min-w-[220px] flex-1">
      <Search aria-hidden="true" className="absolute left-3.5 top-3 h-4 w-4 text-[#717171]" />
      <input
        type="text"
        id={id}
        aria-label={ariaLabel ?? placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-[#EEEEEE] bg-white pl-10 pr-4 text-xs font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none"
      />
    </div>
  );
}
