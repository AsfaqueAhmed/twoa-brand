import { Truck, ShieldCheck, Package } from 'lucide-react';

export const TRUST_ITEMS = [
  { icon: Truck, title: 'Cash on Delivery', subtitle: 'Pay when you receive' },
  { icon: ShieldCheck, title: '100% Risk-Free', subtitle: 'Shop with confidence' },
  { icon: Package, title: 'Nationwide Delivery', subtitle: 'All over Bangladesh' },
];

export default function TrustStrip() {
  return (
    <section className="border-b border-[#EEEEEE] bg-[#FAF9F6]" id="trust-strip">
      <div className="mx-auto grid max-w-7xl grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 px-4 sm:px-6 lg:px-8 py-5 sm:divide-x sm:divide-[#E4E1DA]">
        {TRUST_ITEMS.map(({ icon: Icon, title, subtitle }) => (
          <div key={title} className="flex items-center justify-center gap-3">
            <Icon className="h-7 w-7 text-black" strokeWidth={1.25} />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-black">{title}</p>
              <p className="text-xs text-[#717171]">{subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
