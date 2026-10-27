import { Package, ShieldCheck, Truck } from 'lucide-react';

const BADGES = [
  { Icon: Package, title: '100% Risk-Free', subtitle: 'Shop with confidence' },
  { Icon: Truck, title: 'Nationwide Delivery', subtitle: 'All over Bangladesh' },
  { Icon: ShieldCheck, title: 'Cash on Delivery', subtitle: 'Pay when you receive' },
];

export default function TrustBadges() {
  return (
    <div className="grid grid-cols-3 gap-2 pt-2">
      {BADGES.map(({ Icon, title, subtitle }) => (
        <div key={title} className="flex flex-col items-center text-center gap-1">
          <Icon className="h-6 w-6 text-black" />
          <p className="text-[11px] font-bold text-black">{title}</p>
          <p className="text-[10px] text-[#717171]">{subtitle}</p>
        </div>
      ))}
    </div>
  );
}
