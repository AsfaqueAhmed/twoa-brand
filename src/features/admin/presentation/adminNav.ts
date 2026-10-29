import {
  Home, Package, Layers, ClipboardList, RotateCcw, Shirt, Users, Ticket, Image as ImageIcon,
  Ruler, Rss, BarChart3, TrendingUp, UserSearch, Truck, FolderTree, Download, type LucideIcon,
} from 'lucide-react';

export interface NavLeaf { label: string; href: string }
export interface NavGroup { label: string; icon: LucideIcon; href?: string; badge?: 'pendingOrders'; children?: NavLeaf[] }
export interface NavSection { title?: string; items: NavGroup[] }

export const NAV_SECTIONS: NavSection[] = [
  { items: [{ label: 'Dashboard', icon: Home, href: '/admin' }] },
  {
    title: 'Inventory',
    items: [
      { label: 'Categories', icon: FolderTree, href: '/admin/categories' },
      { label: 'Products', icon: Package, href: '/admin/products' },
      { label: 'Parent Products', icon: Layers, href: '/admin/parent-products' },
    ],
  },
  {
    title: 'Orders',
    items: [
      { label: 'All Orders', icon: ClipboardList, href: '/admin/orders', badge: 'pendingOrders' },
      { label: 'Order Returns', icon: RotateCcw, href: '/admin/returns' },
      { label: 'Custom Quotes', icon: Shirt, href: '/admin/custom-quotes' },
      { label: 'Customers', icon: Users, href: '/admin/customers' },
    ],
  },
  {
    title: 'Promotions',
    items: [
      {
        label: 'Coupons', icon: Ticket,
        children: [
          { label: 'All Coupons', href: '/admin/coupons' },
          { label: 'Usage History', href: '/admin/coupons/usage' },
        ],
      },
      { label: 'Banners', icon: ImageIcon, href: '/admin/banners' },
    ],
  },
  { title: 'Size Charts', items: [{ label: 'All Size Charts', icon: Ruler, href: '/admin/size-charts' }] },
  { title: 'Product Feed', items: [{ label: 'Feed Management', icon: Rss, href: '/admin/product-feed' }] },
  {
    title: 'Reports',
    items: [
      { label: 'Sales Report', icon: BarChart3, href: '/admin/reports/sales' },
      { label: 'Product Performance', icon: TrendingUp, href: '/admin/reports/products' },
      { label: 'Customer Insights', icon: UserSearch, href: '/admin/reports/customers' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Shipping Zones', icon: Truck, href: '/admin/shipping' },
      { label: 'Data Export', icon: Download, href: '/admin/data-export' },
    ],
  },
];

const ALL_HREFS: string[] = NAV_SECTIONS.flatMap((s) =>
  s.items.flatMap((g) => (g.children ? g.children.map((c) => c.href) : g.href ? [g.href] : [])),
);

// Longest href that equals the path or is a path-segment prefix of it.
export function activeHref(pathname: string): string | null {
  let best: string | null = null;
  for (const href of ALL_HREFS) {
    const matches = pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}
