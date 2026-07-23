'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin', label: 'Inventory' },
  { href: '/admin/parent-products', label: 'Parent Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/size-charts', label: 'Size Charts' },
];

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex bg-[#F5F5F5] p-1 border border-[#EEEEEE] rounded-none w-fit mb-6" id="admin-tabs">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-none ${
              isActive
                ? 'bg-white text-black shadow-xs border border-transparent'
                : 'text-[#717171] hover:text-black'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
