'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ticket } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import AdminCard from '@/features/admin/presentation/AdminCard';
import EmptyState from '@/shared/ui/EmptyState';
import Spinner from '@/shared/ui/Spinner';
import { listAllCoupons } from '@/features/admin/coupons/infrastructure/firestoreCouponAdminRepository';
import { isCouponExpired, type Coupon } from '@/features/coupons/domain/coupon';

export default function CouponUsageHistory() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    listAllCoupons()
      .then((list) => setCoupons([...list].sort((a, b) => b.usageCount - a.usageCount)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load coupons'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <div>
      <AdminPageHeader title="Usage History" subtitle="How often each coupon has been redeemed." />
      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {error} <button type="button" onClick={reload} className="font-bold underline">Retry</button>
        </div>
      ) : (
        coupons.length === 0 ? (
          <EmptyState icon={Ticket} title="No coupons yet" description="Create a coupon to start tracking usage." />
        ) : (
          <AdminCard>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="text-xs text-[#717171]">
                  <tr><th className="py-2 font-medium">Code</th><th className="font-medium">Type</th><th className="font-medium">Value</th><th className="font-medium">Used</th><th className="font-medium">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEEE]">
                  {coupons.map((c) => (
                    <tr key={c.code}>
                      <td className="py-3 font-medium">{c.code}</td>
                      <td>{c.discountType}</td>
                      <td>{c.value}</td>
                      <td>{c.usageCount} / {c.usageLimit ?? '∞'}</td>
                      <td>{!c.isActive ? 'Inactive' : isCouponExpired(c) ? 'Expired' : 'Active'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        )
      )}
    </div>
  );
}
