import type { Coupon } from '@/features/coupons/domain/coupon';
import { usageSummary } from '../../domain/couponList';

export default function UsageBar({ coupon }: { coupon: Coupon }) {
  const { used, limit, pct } = usageSummary(coupon);
  if (limit === null) {
    return (
      <div className="text-xs">
        <span className="font-semibold text-black">{used}</span> <span className="text-[#919191]">Unlimited</span>
      </div>
    );
  }
  return (
    <div className="w-32">
      <div className="text-xs font-semibold text-black">
        {used} <span className="font-normal text-[#919191]">/ {limit}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#EEEEEE]">
        <div className={`h-full rounded-full ${pct >= 100 ? 'bg-amber-500' : 'bg-black'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
