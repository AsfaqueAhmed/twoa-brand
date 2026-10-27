'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';
import { NAV_SECTIONS, activeHref, type NavGroup } from './adminNav';
import { fetchAllOrders } from '@/features/orders/infrastructure/firestoreOrdersRepository';

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

  const renderGroup = (g: NavGroup) => {
    const Icon = g.icon;
    if (g.children) {
      const hasActive = g.children.some((c) => c.href === active);
      const open = openGroups[g.label] ?? hasActive;
      return (
        <div key={g.label}>
          <button
            type="button"
            onClick={() => setOpenGroups((s) => ({ ...s, [g.label]: !open }))}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/80 hover:bg-white/10"
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1 text-left">{g.label}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="ml-4 border-l border-white/10 pl-3">
              {g.children.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className={`block rounded-md px-3 py-2 text-[13px] ${c.href === active ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'}`}
                >
                  {c.label}
                </Link>
              ))}
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
        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm ${isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10'}`}
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1">{g.label}</span>
        {g.badge === 'pendingOrders' && pendingOrders > 0 && (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">{pendingOrders}</span>
        )}
      </Link>
    );
  };

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto bg-[#1B1B1B] p-3" aria-label="Admin navigation">
      {NAV_SECTIONS.map((section, i) => (
        <div key={section.title ?? i} className="mb-2">
          {section.title && (
            <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">{section.title}</div>
          )}
          {section.items.map(renderGroup)}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex flex-1 bg-[#FAF8F4]">
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-0 h-[calc(100vh-4rem)]">{sidebar}</div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          className="mb-4 inline-flex items-center gap-2 rounded-md border border-[#EEEEEE] bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider lg:hidden"
          aria-label="Toggle admin menu"
        >
          {drawerOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />} Menu
        </button>
        {children}
      </div>
    </div>
  );
}
