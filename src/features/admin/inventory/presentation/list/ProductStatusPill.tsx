import type { ProductStatus } from '../../domain/productList';

const STYLES: Record<ProductStatus, { label: string; pill: string; dot: string }> = {
  active: { label: 'Active', pill: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  low: { label: 'Low Stock', pill: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  out: { label: 'Out of Stock', pill: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  inactive: { label: 'Inactive', pill: 'bg-[#F0F0F0] text-[#555555]', dot: 'bg-[#A1A1A1]' },
};

export default function ProductStatusPill({ status }: { status: ProductStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
