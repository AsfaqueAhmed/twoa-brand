'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ClipboardList, Home, MoreHorizontal, Package, Store, Users, X } from 'lucide-react';
import { NAV_SECTIONS, activeHref, type NavGroup } from './adminNav';
import { fetchAllOrders } from '@/features/orders/infrastructure/firestoreOrdersRepository';

const TAB_BAR = [
  { label: 'Home', href: '/admin', icon: Home },
  { label: 'Orders', href: '/admin/orders', icon: ClipboardList, badge: true },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Customers', href: '/admin/customers', icon: Users },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = activeHref(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAllOrders()
      .then((orders) => setPendingOrders(orders.filter((o) => o.status === 'pending').length))
      .catch(() => setPendingOrders(0));
  }, [pathname]);

  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const renderGroup = (g: NavGroup, onNavigate?: () => void) => {
    const Icon = g.icon;
    if (g.children) {
      const hasActive = g.children.some((c) => c.href === active);
      const open = openGroups[g.label] ?? hasActive;
      return (
        <div key={g.label}>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpenGroups((s) => ({ ...s, [g.label]: !open }))}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 max-lg:py-3 text-sm text-[#444444] hover:bg-[#F5F5F5] hover:text-black"
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1 text-left">{g.label}</span>
            <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="ml-4 border-l border-[#EEEEEE] pl-3">
              {g.children.map((c) => {
                const isActive = c.href === active;
                return (
                  <Link
                    key={c.href}
                    href={c.href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={onNavigate}
                    className={`block rounded-md px-3 py-2 max-lg:py-2.5 text-[13px] ${isActive ? 'bg-black font-semibold text-white' : 'text-[#717171] hover:bg-[#F5F5F5] hover:text-black'}`}
                  >
                    {c.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    const isActive = g.href === active;
    return (
      <Link
        key={g.label}
        href={g.href!}
        aria-current={isActive ? 'page' : undefined}
        onClick={onNavigate}
        className={`flex items-center gap-3 rounded-md px-3 py-2.5 max-lg:py-3 text-sm ${isActive ? 'bg-black font-semibold text-white' : 'text-[#444444] hover:bg-[#F5F5F5] hover:text-black'}`}
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1">{g.label}</span>
        {g.badge === 'pendingOrders' && pendingOrders > 0 && (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">{pendingOrders}</span>
        )}
      </Link>
    );
  };

  const sidebar = (label: string, onNavigate?: () => void) => (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto border-r border-[#EEEEEE] bg-white p-3" aria-label={label}>
      {NAV_SECTIONS.map((section, i) => (
        <div key={section.title ?? i} className="mb-2">
          {section.title && (
            <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-[#A1A1A1]">{section.title}</div>
          )}
          {section.items.map((g) => renderGroup(g, onNavigate))}
        </div>
      ))}
    </nav>
  );

  const closeDrawer = () => setDrawerOpen(false);

  const moreActive = !TAB_BAR.some((t) => t.href === active);

  return (
    <div className="flex flex-1 flex-col bg-[#FAF8F4]">
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-16 h-[calc(100vh-4rem)]">{sidebar('Admin navigation')}</div>
        </aside>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={closeDrawer} />
            <div className="absolute inset-y-0 left-0 flex w-[85vw] max-w-xs flex-col shadow-xl">
              <div className="flex items-center justify-between border-r border-[#EEEEEE] bg-white px-4 pt-3">
                <span className="text-sm font-bold text-black">Admin menu</span>
                <button
                  type="button"
                  onClick={closeDrawer}
                  aria-label="Close admin menu"
                  className="rounded-md p-2 text-[#444444] hover:bg-[#F5F5F5]"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1">{sidebar('Admin navigation (mobile)', closeDrawer)}</div>
              <Link
                href="/"
                onClick={closeDrawer}
                className="flex items-center gap-3 border-r border-t border-[#EEEEEE] bg-white px-6 py-4 text-sm font-semibold text-black"
                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
              >
                <Store className="h-4 w-4" /> Back to store
              </Link>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      {/* Phone/tablet bottom tab bar for the most-used screens */}
      <nav
        aria-label="Admin shortcuts"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-[#EEEEEE] bg-white/95 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TAB_BAR.map(({ label, href, icon: Icon, badge }) => {
          const isActive = href === active;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-black' : 'text-[#919191]'}`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {badge && pendingOrders > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                    {pendingOrders}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider ${moreActive ? 'text-black' : 'text-[#919191]'}`}
        >
          <MoreHorizontal className="h-5 w-5" />
          More
        </button>
      </nav>
    </div>
  );
}
