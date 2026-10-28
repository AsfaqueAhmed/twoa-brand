'use client';

import { ArrowDownToLine, ArrowUpToLine, MapPin } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import StatCard from '@/features/admin/presentation/ui/StatCard';
import StatsRow from '@/features/admin/presentation/ui/StatsRow';
import StatusPill from '@/features/admin/presentation/ui/StatusPill';
import { TABLE_ROW, TableCard, TableScroll, Th } from '@/features/admin/presentation/ui/TableCard';
import { CITY_CORPORATION_DELIVERY_FEE, DHAKA_SUBURBAN_DELIVERY_FEE, STANDARD_DELIVERY_FEE } from '@/features/checkout/domain/pricing';
import { formatCurrency } from '@/shared/lib/formatCurrency';

const ZONES = [
  { name: 'Dhaka City', description: 'Dhaka North and South City Corporation', fee: CITY_CORPORATION_DELIVERY_FEE },
  { name: 'Dhaka Sub', description: 'Savar, Ashulia, Keraniganj, Tongi, Narayanganj Sadar, Dhamrai, Nawabganj, Dohar, Gazipur Sadar', fee: DHAKA_SUBURBAN_DELIVERY_FEE },
  { name: 'Outside Dhaka', description: 'Everywhere else in Bangladesh', fee: STANDARD_DELIVERY_FEE },
];

export default function ShippingZonesPage() {
  const fees = ZONES.map((z) => z.fee);
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Shipping Zones" subtitle="Delivery fees applied at checkout (defined in code)." />
      <StatsRow>
        <StatCard icon={<MapPin className="h-5 w-5" />} label="Zones" value={ZONES.length} />
        <StatCard icon={<ArrowDownToLine className="h-5 w-5" />} label="Lowest fee" value={formatCurrency(Math.min(...fees))} />
        <StatCard icon={<ArrowUpToLine className="h-5 w-5" />} label="Highest fee" value={formatCurrency(Math.max(...fees))} />
      </StatsRow>
      <TableCard>
        <TableScroll
          minWidth="min-w-[640px]"
          head={<><Th className="pl-5">Zone</Th><Th>Covered areas</Th><Th className="pr-5">Fee</Th></>}
        >
          {ZONES.map((z) => (
            <tr key={z.name} className={TABLE_ROW}>
              <td className="py-4 pl-5 pr-3 font-medium text-black">{z.name}</td>
              <td className="px-3 text-[#717171]">{z.description}</td>
              <td className="px-3 pr-5"><StatusPill tone="blue" dot={false}>{formatCurrency(z.fee)}</StatusPill></td>
            </tr>
          ))}
        </TableScroll>
      </TableCard>
    </div>
  );
}
