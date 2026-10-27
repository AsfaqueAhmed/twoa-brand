'use client';

import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import AdminCard from '@/features/admin/presentation/AdminCard';
import { CITY_CORPORATION_DELIVERY_FEE, DHAKA_SUBURBAN_DELIVERY_FEE, STANDARD_DELIVERY_FEE } from '@/features/checkout/domain/pricing';
import { formatCurrency } from '@/shared/lib/formatCurrency';

const ZONES = [
  { name: 'Dhaka City', description: 'Dhaka North and South City Corporation', fee: CITY_CORPORATION_DELIVERY_FEE },
  { name: 'Dhaka Sub', description: 'Savar, Ashulia, Keraniganj, Tongi, Narayanganj Sadar, Dhamrai, Nawabganj, Dohar, Gazipur Sadar', fee: DHAKA_SUBURBAN_DELIVERY_FEE },
  { name: 'Outside Dhaka', description: 'Everywhere else in Bangladesh', fee: STANDARD_DELIVERY_FEE },
];

export default function ShippingZonesPage() {
  return (
    <div>
      <AdminPageHeader title="Shipping Zones" subtitle="Delivery fees applied at checkout (defined in code)." />
      <AdminCard>
        <ul className="divide-y divide-[#EEEEEE]">
          {ZONES.map((z) => (
            <li key={z.name} className="flex items-center justify-between gap-4 py-4">
              <div><div className="font-semibold">{z.name}</div><div className="text-sm text-[#717171]">{z.description}</div></div>
              <div className="text-lg font-bold">{formatCurrency(z.fee)}</div>
            </li>
          ))}
        </ul>
      </AdminCard>
    </div>
  );
}
