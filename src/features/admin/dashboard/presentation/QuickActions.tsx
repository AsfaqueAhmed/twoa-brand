import Link from 'next/link';
import { Package, PackagePlus, ClipboardList, Ticket, Image as ImageIcon, Ruler, RefreshCw } from 'lucide-react';

const ACTIONS = [
  { label: 'Add Product', href: '/admin/products', icon: Package },
  { label: 'Create Order', href: '/admin/orders/new', icon: PackagePlus },
  { label: 'Manage Orders', href: '/admin/orders', icon: ClipboardList },
  { label: 'Create Coupon', href: '/admin/coupons', icon: Ticket },
  { label: 'Add Banner', href: '/admin/banners', icon: ImageIcon },
  { label: 'Add Size Chart', href: '/admin/size-charts', icon: Ruler },
  { label: 'Refresh Feed', href: '/admin/product-feed', icon: RefreshCw },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ACTIONS.map(({ label, href, icon: Icon }) => (
        <Link key={label} href={href} className="flex flex-col last:col-span-2 items-center gap-2 rounded-lg border border-[#EEEEEE] bg-white px-2 py-4 text-center text-xs font-medium hover:border-black">
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </div>
  );
}
