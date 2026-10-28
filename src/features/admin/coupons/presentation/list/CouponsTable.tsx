import { Edit2, Trash2 } from 'lucide-react';
import { TABLE_ROW, TableScroll, Th } from '@/features/admin/presentation/ui/TableCard';
import type { Coupon } from '@/features/coupons/domain/coupon';
import { districts } from '@/features/checkout/infrastructure/bangladeshAreas';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { TYPE_LABEL, couponStatus, formatCouponValue } from '../../domain/couponList';
import CouponStatusPill from './CouponStatusPill';
import UsageBar from './UsageBar';

type Props = {
  coupons: Coupon[];
  onEdit: (c: Coupon) => void;
  onDelete: (c: Coupon) => void;
  onToggleActive: (c: Coupon) => void;
  onToggleVisibility: (c: Coupon) => void;
};

export default function CouponsTable({ coupons, onEdit, onDelete, onToggleActive, onToggleVisibility }: Props) {
  const now = new Date();
  return (
    <TableScroll
      minWidth="min-w-[1000px]"
      head={
        <>
          <Th className="pl-5">Code</Th>
          <Th>Discount</Th>
          <Th>Min subtotal</Th>
          <Th>District</Th>
          <Th>Usage</Th>
          <Th>Expires</Th>
          <Th>Visibility</Th>
          <Th>Status</Th>
          <Th className="pr-5 text-right">Actions</Th>
        </>
      }
    >
      {coupons.map((c) => (
        <tr key={c.code} className={TABLE_ROW}>
          <td className="py-3 pl-5 pr-3 font-mono font-bold text-black">{c.code}</td>
          <td className="px-3 py-3">
            <div className="font-semibold text-black">{formatCouponValue(c)}</div>
            <div className="text-[11px] text-[#919191]">{TYPE_LABEL[c.discountType]}</div>
          </td>
          <td className="px-3 py-3">{c.minOrderSubtotal ? formatCurrency(c.minOrderSubtotal) : '—'}</td>
          <td className="px-3 py-3">
            {c.districtRestriction ? (districts.find((d) => d.id === c.districtRestriction)?.name ?? c.districtRestriction) : '—'}
          </td>
          <td className="px-3 py-3">
            <UsageBar coupon={c} />
          </td>
          <td className="whitespace-nowrap px-3 py-3">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}</td>
          <td className="px-3 py-3">
            <button
              type="button"
              onClick={() => onToggleVisibility(c)}
              aria-pressed={c.isPublic}
              aria-label={`${c.isPublic ? 'Make private' : 'Make public'} ${c.code}`}
              title={c.isPublic ? 'Shown at checkout (click to make private)' : 'Hidden, code entry only (click to make public)'}
              className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                c.isPublic ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-[#EEEEEE] bg-[#F5F5F5] text-[#717171]'
              }`}
            >
              {c.isPublic ? 'Public' : 'Private'}
            </button>
          </td>
          <td className="px-3 py-3">
            <div className="flex items-center gap-2">
              <CouponStatusPill status={couponStatus(c, now)} />
              <button
                type="button"
                onClick={() => onToggleActive(c)}
                aria-pressed={c.isActive}
                aria-label={`${c.isActive ? 'Deactivate' : 'Activate'} ${c.code}`}
                title={c.isActive ? 'Click to deactivate' : 'Click to activate'}
                className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                  c.isActive ? 'border-green-200 bg-green-50 text-green-700' : 'border-[#EEEEEE] bg-[#F5F5F5] text-[#717171]'
                }`}
              >
                {c.isActive ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </td>
          <td className="px-3 py-3 pr-5">
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => onEdit(c)}
                title="Edit Coupon"
                aria-label={`Edit ${c.code}`}
                className="rounded-lg border border-[#EEEEEE] bg-white p-2 text-black transition-colors hover:border-black"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(c)}
                title="Delete Coupon"
                aria-label={`Delete ${c.code}`}
                className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </td>
        </tr>
      ))}
    </TableScroll>
  );
}
