import type { ProductStatus } from '../../domain/productList';
import StatusPill from '@/features/admin/presentation/ui/StatusPill';
import type { Tone } from '@/features/admin/presentation/ui/tones';

const STYLES: Record<ProductStatus, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'green' },
  low: { label: 'Low Stock', tone: 'amber' },
  out: { label: 'Out of Stock', tone: 'red' },
  inactive: { label: 'Inactive', tone: 'gray' },
};

export default function ProductStatusPill({ status }: { status: ProductStatus }) {
  const s = STYLES[status];
  return <StatusPill tone={s.tone}>{s.label}</StatusPill>;
}
