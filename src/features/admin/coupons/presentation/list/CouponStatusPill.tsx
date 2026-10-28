import StatusPill from '@/features/admin/presentation/ui/StatusPill';
import type { Tone } from '@/features/admin/presentation/ui/tones';
import type { CouponStatus } from '../../domain/couponList';

export const COUPON_STATUS_META: Record<CouponStatus, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'green' },
  inactive: { label: 'Inactive', tone: 'gray' },
  expired: { label: 'Expired', tone: 'red' },
  limit: { label: 'Limit reached', tone: 'amber' },
};

export default function CouponStatusPill({ status }: { status: CouponStatus }) {
  const m = COUPON_STATUS_META[status];
  return <StatusPill tone={m.tone}>{m.label}</StatusPill>;
}
