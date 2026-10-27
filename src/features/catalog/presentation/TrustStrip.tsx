import { Truck, ShieldCheck, Package } from 'lucide-react';

export const TRUST_ITEMS = [
  { icon: Truck, title: 'Cash on Delivery', subtitle: 'Pay when you receive' },
  { icon: ShieldCheck, title: '100% Risk-Free', subtitle: 'Shop with confidence' },
  { icon: Package, title: 'Nationwide Delivery', subtitle: 'All over Bangladesh' },
];

export default function TrustStrip() {
  return (
    <section className="border-b border-[#EEEEEE] bg-[#FAF9F6]" id="trust-strip">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2 sm:gap-0 px-3 sm:px-6 lg:px-8 py-3 sm:py-5 sm:divide-x sm:divide-[#E4E1DA]">
        {TRUST_ITEMS.map(({ icon: Icon, title, subtitle }) => (
          <div key={title} className="flex flex-col items-center justify-start gap-1.5 text-center sm:flex-row sm:justify-center sm:gap-3 sm:text-left">
            <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-black" strokeWidth={1.25} />
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight sm:leading-normal text-black">{title}</p>
              <p className="hidden sm:block text-xs text-[#717171]">{subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
