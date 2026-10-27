import { Truck } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/formatCurrency';

interface Props {
  deliveryFee: number;
  zoneLabel: string;
  hasZone: boolean;
}

export default function DeliveryZoneCard({ deliveryFee, zoneLabel, hasZone }: Props) {
  return (
    <section className="border border-[#EEEEEE] bg-white p-5 sm:p-6" id="checkout-zone-card">
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-black">
        <Truck className="h-5 w-5" />
        <span>Delivery Zone</span>
      </h2>
      <p className="text-xs text-[#717171] mt-1">Your delivery charge is based on the area you select above.</p>

      <div className="mt-4 flex items-center gap-4 border border-[#DDE8DD] bg-[#F1F7F1] p-4">
        <Truck className="h-7 w-7 text-[#1F4D2B] shrink-0" />
        {hasZone ? (
          <div>
            <p className="text-sm font-bold text-[#1F4D2B]">Delivery Charge: {formatCurrency(deliveryFee)}</p>
            <p className="text-xs text-[#4B6B53]">{zoneLabel}</p>
          </div>
        ) : (
          <p className="text-sm text-[#4B6B53]">Select your division, district and area to see the delivery charge.</p>
        )}
      </div>
    </section>
  );
}
