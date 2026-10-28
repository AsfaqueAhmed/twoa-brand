# Admin Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin tab strip with a sidebar shell, add a dashboard home, restyle existing admin pages, and add report/customer/returns/shipping pages.

**Architecture:** `src/app/admin/layout.tsx` renders the storefront `Navbar` (unchanged), `RequireAdmin`, and a new `AdminShell` (sidebar + content). Dashboard and report pages consume pure aggregation functions in `src/features/admin/analytics/domain/analytics.ts` fed by the existing `fetchAllOrders`, `fetchAllProducts`, `fetchAllParentProducts`, `listAllCoupons`. Order Returns adds one Supabase table.

**Tech Stack:** Next.js 15 (app router, client components), React 19, Tailwind 4, lucide-react, Supabase JS, vitest (node env, tests in `src/**/*.test.ts`).

## Global Constraints

- The storefront `Navbar` (`src/features/catalog/presentation/Navbar.tsx`) is NOT modified.
- No new npm dependencies; charts are plain SVG.
- No schema change to `orders`; status labels map onto the existing `OrderStatus` union: `pending`=Pending, `confirmed`=Processing, `out_for_delivery`=Out for Delivery, `delivered`=Delivered, `cancelled`=Cancelled.
- Cancelled orders are excluded from sales, products-sold and top-seller figures.
- Currency is formatted with `formatCurrency` from `@/shared/lib/formatCurrency` (renders `৳1234.00`).
- Not in nav (no backing data): Product Templates, Image Library, Tags, Subcategories, Offers.
- Each task ends green on `npm run lint` (tsc) and `npm test`, and is its own commit. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## File Structure

- `src/features/admin/analytics/domain/analytics.ts` (+ `.test.ts`): pure aggregation (ranges, stats, series, top products, customers, low stock, activity).
- `src/features/admin/analytics/application/useAdminData.ts`: hook loading orders + products.
- `src/features/admin/presentation/adminNav.ts` (+ `.test.ts`): nav config, `activeHref`.
- `src/features/admin/presentation/AdminShell.tsx`: sidebar/drawer + content frame.
- `src/features/admin/presentation/AdminPageHeader.tsx`, `AdminCard.tsx`: shared page primitives.
- `src/features/admin/dashboard/presentation/*`: dashboard widgets + `DashboardPage.tsx`.
- `src/features/admin/reports/presentation/*`, `customers/presentation/*`, `shipping/presentation/*`, `coupons/presentation/CouponUsageHistory.tsx`.
- `src/features/admin/returns/{infrastructure,presentation}/*` and `supabase/migrations/20261027000100_order_returns.sql`.
- `src/app/admin/layout.tsx` and thin `page.tsx` per route.

---

### Task 1: Analytics domain (TDD)

**Files:**
- Create: `src/features/admin/analytics/domain/analytics.ts`
- Test: `src/features/admin/analytics/domain/analytics.test.ts`

**Interfaces:**
- Produces (exact exports used by later tasks):
  - `type DateRange = { from: Date; to: Date }` (inclusive)
  - `lastNDays(n: number, now?: Date): DateRange`
  - `previousRange(range: DateRange): DateRange`
  - `filterOrdersByRange(orders: Order[], range: DateRange): Order[]`
  - `percentChange(current: number, previous: number): number | null`
  - `type DashboardStats = { totalOrders: number; totalSales: number; productsSold: number; newCustomers: number }`
  - `computeStats(allOrders: Order[], range: DateRange): DashboardStats`
  - `STATUS_LABELS: Record<OrderStatus, string>`, `STATUS_ORDER: OrderStatus[]`
  - `countByStatus(orders: Order[]): Record<OrderStatus, number>`
  - `dailySales(orders: Order[], range: DateRange): { date: string; total: number }[]` (date = local `YYYY-MM-DD`)
  - `type TopProduct = { productId: string; name: string; image: string; sold: number; revenue: number }`
  - `topProducts(orders: Order[], limit: number): TopProduct[]`
  - `type CustomerSummary = { key: string; name: string; email: string; phone: string; orderCount: number; totalSpent: number; firstOrderAt: string; lastOrderAt: string }`
  - `buildCustomers(orders: Order[]): CustomerSummary[]` (sorted by totalSpent desc; key = `userId`)
  - `type StockProduct = { id: string; name: string; image: string; stock: number }`
  - `lowStockProducts(products: Product[], threshold: number, limit: number): StockProduct[]` (stock = sum of `parentProduct.stockBySize`; products without `parentProduct` skipped; ascending stock; only `stock <= threshold`)
  - `type ActivityEvent = { id: string; kind: 'order' | 'status'; title: string; detail: string; at: string }`
  - `recentActivity(orders: Order[], limit: number): ActivityEvent[]`
  - `formatRelativeTime(iso: string, now?: Date): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/admin/analytics/domain/analytics.test.ts
import { describe, it, expect } from 'vitest';
import type { Order, Product } from '@/shared/domain/types';
import {
  lastNDays, previousRange, filterOrdersByRange, percentChange, computeStats, countByStatus,
  dailySales, topProducts, buildCustomers, lowStockProducts, recentActivity, formatRelativeTime,
} from './analytics';

function order(over: Partial<Order> & { id: string }): Order {
  return {
    userId: 'u1', userName: 'A', userEmail: 'a@x.com', address: '', phone: '017',
    items: [{ productId: 'p1', name: 'Tee', price: 100, quantity: 2, image: 'i.png' }],
    totalAmount: 200, status: 'pending', paymentMethod: 'cash_on_delivery',
    createdAt: '2026-10-27T10:00:00', updatedAt: '2026-10-27T10:00:00', ...over,
  };
}
const now = new Date('2026-10-27T12:00:00');

describe('ranges', () => {
  it('lastNDays covers n local days ending today', () => {
    const r = lastNDays(7, now);
    expect(r.from.getDate()).toBe(21);
    expect(r.to.getDate()).toBe(27);
  });
  it('previousRange is the same length immediately before', () => {
    const p = previousRange(lastNDays(7, now));
    expect(p.to.getDate()).toBe(20);
    expect(p.from.getDate()).toBe(14);
  });
  it('filterOrdersByRange is inclusive of both ends', () => {
    const r = lastNDays(1, now);
    const orders = [order({ id: 'a' }), order({ id: 'b', createdAt: '2026-10-26T23:59:00' })];
    expect(filterOrdersByRange(orders, r).map((o) => o.id)).toEqual(['a']);
  });
});

describe('percentChange', () => {
  it('computes rounded percent', () => expect(percentChange(112, 100)).toBe(12));
  it('is null when previous is 0', () => expect(percentChange(5, 0)).toBeNull());
});

describe('computeStats', () => {
  it('excludes cancelled from sales and products sold, counts new customers by first order', () => {
    const orders = [
      order({ id: 'a' }),
      order({ id: 'b', userId: 'u2', status: 'cancelled' }),
      order({ id: 'c', userId: 'u1', createdAt: '2026-10-01T10:00:00' }),
    ];
    const s = computeStats(orders, lastNDays(7, now));
    expect(s).toEqual({ totalOrders: 1, totalSales: 200, productsSold: 2, newCustomers: 1 });
  });
});

describe('countByStatus', () => {
  it('returns zero for absent statuses', () => {
    const c = countByStatus([order({ id: 'a' }), order({ id: 'b', status: 'delivered' })]);
    expect(c).toEqual({ pending: 1, confirmed: 0, out_for_delivery: 0, delivered: 1, cancelled: 0 });
  });
});

describe('dailySales', () => {
  it('fills every day in range, summing non-cancelled totals', () => {
    const r = lastNDays(3, now);
    const s = dailySales([order({ id: 'a' }), order({ id: 'b', status: 'cancelled' })], r);
    expect(s).toEqual([
      { date: '2026-10-25', total: 0 },
      { date: '2026-10-26', total: 0 },
      { date: '2026-10-27', total: 200 },
    ]);
  });
});

describe('topProducts', () => {
  it('aggregates by productId, sorted by units sold, skipping cancelled', () => {
    const orders = [
      order({ id: 'a' }),
      order({ id: 'b', items: [{ productId: 'p2', name: 'Hoodie', price: 300, quantity: 5, image: 'h.png' }] }),
      order({ id: 'c', status: 'cancelled', items: [{ productId: 'p3', name: 'X', price: 1, quantity: 99, image: '' }] }),
    ];
    const t = topProducts(orders, 5);
    expect(t.map((p) => p.productId)).toEqual(['p2', 'p1']);
    expect(t[0]).toMatchObject({ sold: 5, revenue: 1500 });
  });
});

describe('buildCustomers', () => {
  it('groups by userId and sorts by total spent', () => {
    const c = buildCustomers([
      order({ id: 'a' }),
      order({ id: 'b', totalAmount: 50, createdAt: '2026-10-28T10:00:00' }),
      order({ id: 'c', userId: 'u2', userName: 'B', totalAmount: 900 }),
    ]);
    expect(c.map((x) => x.key)).toEqual(['u2', 'u1']);
    expect(c[1]).toMatchObject({ orderCount: 2, totalSpent: 250, firstOrderAt: '2026-10-27T10:00:00', lastOrderAt: '2026-10-28T10:00:00' });
  });
});

describe('lowStockProducts', () => {
  const p = (id: string, stock?: Record<string, number>): Product => ({
    id, name: id, description: '', price: 1, image: `${id}.png`, category: 'c', rating: 0,
    parentProduct: stock ? { id: 'pp', name: 'pp', sizeOrder: Object.keys(stock), stockBySize: stock } : undefined,
  });
  it('sums sizes, filters by threshold, sorts ascending, skips no-parent', () => {
    const r = lowStockProducts([p('a', { S: 5, M: 5 }), p('b', { S: 3 }), p('c', { S: 50 }), p('d')], 10, 5);
    expect(r.map((x) => [x.id, x.stock])).toEqual([['b', 3], ['a', 10]]);
  });
});

describe('recentActivity', () => {
  it('emits order + status events newest first', () => {
    const orders = [
      order({ id: 'ord_aaaaaaaa11111111', createdAt: '2026-10-27T09:00:00', updatedAt: '2026-10-27T11:00:00', status: 'out_for_delivery' }),
    ];
    const ev = recentActivity(orders, 5);
    expect(ev.map((e) => e.kind)).toEqual(['status', 'order']);
    expect(ev[0].title).toBe('Order status updated to Out for Delivery');
    expect(ev[0].detail).toBe('#11111111');
  });
});

describe('formatRelativeTime', () => {
  it('formats minutes, hours, days', () => {
    expect(formatRelativeTime('2026-10-27T11:50:00', now)).toBe('10 mins ago');
    expect(formatRelativeTime('2026-10-27T09:00:00', now)).toBe('3 hours ago');
    expect(formatRelativeTime('2026-10-25T12:00:00', now)).toBe('2 days ago');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/features/admin/analytics`
Expected: FAIL (cannot resolve `./analytics`).

- [ ] **Step 3: Implement**

```ts
// src/features/admin/analytics/domain/analytics.ts
import type { Order, OrderStatus, Product } from '@/shared/domain/types';

export type DateRange = { from: Date; to: Date };

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function lastNDays(n: number, now: Date = new Date()): DateRange {
  const to = endOfDay(now);
  const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1)));
  return { from, to };
}

export function previousRange(range: DateRange): DateRange {
  const days = Math.round((startOfDay(range.to).getTime() - startOfDay(range.from).getTime()) / DAY_MS) + 1;
  const to = endOfDay(new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate() - 1));
  const from = startOfDay(new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate() - days));
  return { from, to };
}

function inRange(iso: string, range: DateRange): boolean {
  const t = new Date(iso).getTime();
  return t >= range.from.getTime() && t <= range.to.getTime();
}

export function filterOrdersByRange(orders: Order[], range: DateRange): Order[] {
  return orders.filter((o) => inRange(o.createdAt, range));
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export type DashboardStats = { totalOrders: number; totalSales: number; productsSold: number; newCustomers: number };

const isLive = (o: Order) => o.status !== 'cancelled';

export function computeStats(allOrders: Order[], range: DateRange): DashboardStats {
  const inWindow = filterOrdersByRange(allOrders, range);
  const live = inWindow.filter(isLive);
  const firstOrderByUser = new Map<string, number>();
  for (const o of allOrders) {
    const t = new Date(o.createdAt).getTime();
    const prev = firstOrderByUser.get(o.userId);
    if (prev === undefined || t < prev) firstOrderByUser.set(o.userId, t);
  }
  let newCustomers = 0;
  for (const t of firstOrderByUser.values()) {
    if (t >= range.from.getTime() && t <= range.to.getTime()) newCustomers++;
  }
  return {
    totalOrders: live.length,
    totalSales: live.reduce((s, o) => s + o.totalAmount, 0),
    productsSold: live.reduce((s, o) => s + o.items.reduce((n, i) => n + i.quantity, 0), 0),
    newCustomers,
  };
}

export const STATUS_ORDER: OrderStatus[] = ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Processing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function countByStatus(orders: Order[]): Record<OrderStatus, number> {
  const counts: Record<OrderStatus, number> = { pending: 0, confirmed: 0, out_for_delivery: 0, delivered: 0, cancelled: 0 };
  for (const o of orders) counts[o.status]++;
  return counts;
}

export function dailySales(orders: Order[], range: DateRange): { date: string; total: number }[] {
  const totals = new Map<string, number>();
  for (let d = startOfDay(range.from); d.getTime() <= range.to.getTime(); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    totals.set(dayKey(d), 0);
  }
  for (const o of orders) {
    if (!isLive(o) || !inRange(o.createdAt, range)) continue;
    const k = dayKey(new Date(o.createdAt));
    if (totals.has(k)) totals.set(k, (totals.get(k) ?? 0) + o.totalAmount);
  }
  return [...totals.entries()].map(([date, total]) => ({ date, total }));
}

export type TopProduct = { productId: string; name: string; image: string; sold: number; revenue: number };

export function topProducts(orders: Order[], limit: number): TopProduct[] {
  const map = new Map<string, TopProduct>();
  for (const o of orders) {
    if (!isLive(o)) continue;
    for (const i of o.items) {
      const cur = map.get(i.productId) ?? { productId: i.productId, name: i.name, image: i.image, sold: 0, revenue: 0 };
      cur.sold += i.quantity;
      cur.revenue += i.price * i.quantity;
      map.set(i.productId, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.sold - a.sold).slice(0, limit);
}

export type CustomerSummary = {
  key: string; name: string; email: string; phone: string;
  orderCount: number; totalSpent: number; firstOrderAt: string; lastOrderAt: string;
};

export function buildCustomers(orders: Order[]): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>();
  for (const o of orders) {
    const cur = map.get(o.userId);
    if (!cur) {
      map.set(o.userId, {
        key: o.userId, name: o.userName, email: o.userEmail, phone: o.phone,
        orderCount: 1, totalSpent: isLive(o) ? o.totalAmount : 0, firstOrderAt: o.createdAt, lastOrderAt: o.createdAt,
      });
      continue;
    }
    cur.orderCount++;
    if (isLive(o)) cur.totalSpent += o.totalAmount;
    if (o.createdAt < cur.firstOrderAt) cur.firstOrderAt = o.createdAt;
    if (o.createdAt > cur.lastOrderAt) {
      cur.lastOrderAt = o.createdAt;
      cur.name = o.userName;
      cur.email = o.userEmail;
      cur.phone = o.phone;
    }
  }
  return [...map.values()].sort((a, b) => b.totalSpent - a.totalSpent);
}

export type StockProduct = { id: string; name: string; image: string; stock: number };

export function lowStockProducts(products: Product[], threshold: number, limit: number): StockProduct[] {
  const out: StockProduct[] = [];
  for (const p of products) {
    if (!p.parentProduct) continue;
    const stock = Object.values(p.parentProduct.stockBySize).reduce((s, n) => s + n, 0);
    if (stock <= threshold) out.push({ id: p.id, name: p.name, image: p.image, stock });
  }
  return out.sort((a, b) => a.stock - b.stock).slice(0, limit);
}

export type ActivityEvent = { id: string; kind: 'order' | 'status'; title: string; detail: string; at: string };

const shortId = (id: string) => `#${id.slice(-8)}`;

export function recentActivity(orders: Order[], limit: number): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const o of orders) {
    events.push({ id: `${o.id}:order`, kind: 'order', title: 'New order received', detail: shortId(o.id), at: o.createdAt });
    if (o.updatedAt !== o.createdAt) {
      events.push({
        id: `${o.id}:status`, kind: 'status',
        title: `Order status updated to ${STATUS_LABELS[o.status]}`, detail: shortId(o.id), at: o.updatedAt,
      });
    }
  }
  return events.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} ${mins === 1 ? 'min' : 'mins'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/features/admin/analytics && npm run lint`
Expected: all analytics tests PASS; tsc exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/analytics
git commit -m "feat(admin): add analytics aggregation domain"
```

---

### Task 2: Admin data hook

**Files:**
- Create: `src/features/admin/analytics/application/useAdminData.ts`

**Interfaces:**
- Consumes: `fetchAllOrders` (`@/features/orders/infrastructure/firestoreOrdersRepository`), `fetchAllProducts` (`@/features/catalog/infrastructure/firestoreProductsRepository`), `fetchAllParentProducts` (`@/features/catalog/infrastructure/firestoreParentProductsRepository`).
- Produces: `useAdminData(opts?: { products?: boolean }): { orders: Order[]; products: Product[]; loading: boolean; error: string | null; reload: () => void }`. Products carry the joined `parentProduct`. Orders are newest-first.

- [ ] **Step 1: Implement**

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Order, Product } from '@/shared/domain/types';
import { fetchAllOrders } from '@/features/orders/infrastructure/firestoreOrdersRepository';
import { fetchAllProducts } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import { fetchAllParentProducts } from '@/features/catalog/infrastructure/firestoreParentProductsRepository';

export function useAdminData(opts: { products?: boolean } = {}) {
  const withProducts = opts.products ?? false;
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [o, p, pp] = await Promise.all([
          fetchAllOrders(),
          withProducts ? fetchAllProducts() : Promise.resolve([] as Product[]),
          withProducts ? fetchAllParentProducts() : Promise.resolve([]),
        ]);
        if (cancelled) return;
        const parentById = new Map(pp.map((x) => [x.id, x]));
        setOrders(o);
        setProducts(p.map((prod) => ({ ...prod, parentProduct: prod.parentProductId ? parentById.get(prod.parentProductId) : undefined })));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [withProducts, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { orders, products, loading, error, reload };
}
```

- [ ] **Step 2: Verify and commit**

Run: `npm run lint` — Expected: exits 0.

```bash
git add src/features/admin/analytics/application
git commit -m "feat(admin): add useAdminData hook"
```

---

### Task 3: Nav config + shell + routing

**Files:**
- Create: `src/features/admin/presentation/adminNav.ts`, `adminNav.test.ts`, `AdminShell.tsx`, `AdminPageHeader.tsx`, `AdminCard.tsx`
- Create: `src/app/admin/layout.tsx`, `src/app/admin/products/page.tsx`
- Modify: `src/app/admin/page.tsx` (becomes dashboard placeholder; filled in Task 4), and `src/app/admin/{orders,coupons,banners,parent-products,size-charts,product-feed}/page.tsx`
- Delete: `src/features/admin/presentation/AdminTabs.tsx`

**Interfaces:**
- Produces: `NAV_SECTIONS`, `activeHref(pathname: string): string | null`, `<AdminShell>{children}</AdminShell>`, `<AdminPageHeader title subtitle? actions? />`, `<AdminCard title? action? className?>{children}</AdminCard>`.

- [ ] **Step 1: Write failing test for `activeHref`**

```ts
// src/features/admin/presentation/adminNav.test.ts
import { describe, it, expect } from 'vitest';
import { activeHref } from './adminNav';

describe('activeHref', () => {
  it('matches dashboard only on exact /admin', () => {
    expect(activeHref('/admin')).toBe('/admin');
  });
  it('picks the longest matching href', () => {
    expect(activeHref('/admin/coupons')).toBe('/admin/coupons');
    expect(activeHref('/admin/coupons/usage')).toBe('/admin/coupons/usage');
  });
  it('matches nested paths to their section', () => {
    expect(activeHref('/admin/orders/anything')).toBe('/admin/orders');
  });
  it('returns null for unknown routes', () => {
    expect(activeHref('/admin/nope')).toBeNull();
  });
});
```

Run: `npx vitest run src/features/admin/presentation` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement `adminNav.ts`**

```ts
import {
  Home, Package, Layers, ClipboardList, RotateCcw, Users, Ticket, Image as ImageIcon,
  Ruler, Rss, BarChart3, TrendingUp, UserSearch, Truck, History, type LucideIcon,
} from 'lucide-react';

export interface NavLeaf { label: string; href: string; icon?: LucideIcon; badge?: 'pendingOrders' }
export interface NavGroup { label: string; icon: LucideIcon; href?: string; badge?: 'pendingOrders'; children?: NavLeaf[] }
export interface NavSection { title?: string; items: NavGroup[] }

export const NAV_SECTIONS: NavSection[] = [
  { items: [{ label: 'Dashboard', icon: Home, href: '/admin' }] },
  {
    title: 'Inventory',
    items: [
      { label: 'Products', icon: Package, href: '/admin/products' },
      { label: 'Parent Products', icon: Layers, href: '/admin/parent-products' },
    ],
  },
  {
    title: 'Orders',
    items: [
      { label: 'All Orders', icon: ClipboardList, href: '/admin/orders', badge: 'pendingOrders' },
      { label: 'Order Returns', icon: RotateCcw, href: '/admin/returns' },
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
          { label: 'Usage History', href: '/admin/coupons/usage', icon: History },
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
  { title: 'Settings', items: [{ label: 'Shipping Zones', icon: Truck, href: '/admin/shipping' }] },
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
```

- [ ] **Step 3: Implement primitives**

```tsx
// AdminPageHeader.tsx
export default function AdminPageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#717171]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

```tsx
// AdminCard.tsx
export default function AdminCard({ title, action, className = '', children }: { title?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-lg border border-[#EEEEEE] bg-white p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-base font-bold text-black">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Implement `AdminShell.tsx`**

```tsx
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
```

Note: the `h-[calc(100vh-4rem)]` assumes the Navbar is ~4rem tall. In Step 7, check it visually and adjust to the real Navbar height.

- [ ] **Step 5: Layout and routes**

`src/app/admin/layout.tsx`:

```tsx
import Navbar from '@/features/catalog/presentation/Navbar';
import RequireAdmin from '@/features/auth/presentation/RequireAdmin';
import AdminShell from '@/features/admin/presentation/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F4] font-sans">
      <Navbar />
      <RequireAdmin>
        <AdminShell>{children}</AdminShell>
      </RequireAdmin>
    </div>
  );
}
```

`src/app/admin/products/page.tsx`:

```tsx
'use client';

import InventoryManager from '@/features/admin/inventory/presentation/InventoryManager';

export default function AdminProductsPage() {
  return <InventoryManager />;
}
```

Rewrite each of `orders/coupons/banners/parent-products/size-charts/product-feed` `page.tsx` to the same thin shape, importing its existing manager (`AdminOrderManager`, `CouponManager`, `BannerManager`, `ParentProductManager`, `SizeChartManager`, `ProductFeedManager`) from the paths already used in those files. Temporarily make `src/app/admin/page.tsx`:

```tsx
export default function AdminDashboardPage() {
  return <div>Dashboard</div>;
}
```

Then `git rm src/features/admin/presentation/AdminTabs.tsx`.

- [ ] **Step 6: Verify**

Run: `npm run lint && npm test` — Expected: tsc 0, all tests pass (including `activeHref`).

- [ ] **Step 7: Visual check**

Start dev server (`npm run dev`), sign in as admin, visit `/admin/products`, `/admin/orders`, `/admin/coupons/usage` (404 for now is fine). Confirm: sidebar renders, active item highlights, mobile width shows Menu button and drawer, Navbar unchanged. Adjust the sticky sidebar height to the real Navbar height if it overflows.

- [ ] **Step 8: Commit**

```bash
git add -A src/app/admin src/features/admin/presentation
git commit -m "feat(admin): sidebar shell, nav config and thin admin routes"
```

---

### Task 4: Dashboard

**Files:**
- Create: `src/features/admin/dashboard/presentation/{StatCard,SalesChart,StatusDonut,QuickActions,LowStockList,RecentOrdersTable,TopSellers,RecentActivity,DashboardPage}.tsx`
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: everything from Task 1 and 2, `AdminPageHeader`, `AdminCard`.
- Produces: `<DashboardPage />` default export.

- [ ] **Step 1: `StatCard.tsx`**

```tsx
import { ArrowUp, ArrowDown, type LucideIcon } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, change }: { icon: LucideIcon; label: string; value: string; change: number | null }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-[#EEEEEE] bg-white p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#EEEEEE]"><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <div className="text-sm text-[#717171]">{label}</div>
        <div className="truncate text-3xl font-bold text-black">{value}</div>
        <div className="text-xs text-[#717171]">
          {change === null ? (
            'No previous data'
          ) : (
            <span className={`inline-flex items-center gap-0.5 font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(change)}%
            </span>
          )}{' '}
          {change !== null && 'vs previous period'}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `SalesChart.tsx`** (SVG area/line; hover shows value)

```tsx
'use client';

import { useState } from 'react';
import { formatCurrency } from '@/shared/lib/formatCurrency';

export default function SalesChart({ data }: { data: { date: string; total: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 220, PAD = { l: 48, r: 12, t: 12, b: 28 };
  const max = Math.max(1, ...data.map((d) => d.total));
  const x = (i: number) => PAD.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * (W - PAD.l - PAD.r));
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.total)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${H - PAD.b} L${x(0)},${H - PAD.b} Z`;
  const step = Math.max(1, Math.ceil(data.length / 7));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sales over time" onMouseLeave={() => setHover(null)}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)} stroke="#EEEEEE" />
          <text x={PAD.l - 6} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill="#717171">{Math.round(max * f)}</text>
        </g>
      ))}
      <path d={area} fill="#16a34a" opacity="0.12" />
      <path d={line} fill="none" stroke="#16a34a" strokeWidth="2" />
      {data.map((d, i) => (
        <g key={d.date}>
          <rect x={x(i) - 10} y={PAD.t} width="20" height={H - PAD.t - PAD.b} fill="transparent" onMouseEnter={() => setHover(i)} />
          {i % step === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#717171">{d.date.slice(5)}</text>}
        </g>
      ))}
      {hover !== null && (
        <g>
          <circle cx={x(hover)} cy={y(data[hover].total)} r="4" fill="#16a34a" />
          <text x={Math.min(Math.max(x(hover), 70), W - 70)} y={y(data[hover].total) - 10} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
            {data[hover].date.slice(5)}: {formatCurrency(data[hover].total)}
          </text>
        </g>
      )}
    </svg>
  );
}
```

- [ ] **Step 3: `StatusDonut.tsx`**

```tsx
import type { OrderStatus } from '@/shared/domain/types';
import { STATUS_LABELS, STATUS_ORDER } from '@/features/admin/analytics/domain/analytics';

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#f59e0b', confirmed: '#2563eb', out_for_delivery: '#6366f1', delivered: '#16a34a', cancelled: '#dc2626',
};

export default function StatusDonut({ counts }: { counts: Record<OrderStatus, number> }) {
  const total = STATUS_ORDER.reduce((s, k) => s + counts[k], 0);
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label="Orders by status">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#EEEEEE" strokeWidth="16" />
        {total > 0 && STATUS_ORDER.map((k) => {
          const len = (counts[k] / total) * C;
          const el = (
            <circle key={k} cx="70" cy="70" r={R} fill="none" stroke={STATUS_COLORS[k]} strokeWidth="16"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
        <g className="rotate-90 origin-center">
          <text x="70" y="70" textAnchor="middle" fontSize="22" fontWeight="bold">{total}</text>
          <text x="70" y="86" textAnchor="middle" fontSize="9" fill="#717171">Total Orders</text>
        </g>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {STATUS_ORDER.map((k) => (
          <li key={k} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[k] }} />
            <span className="flex-1 text-[#717171]">{STATUS_LABELS[k]}</span>
            <span className="font-semibold">{counts[k]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Quick actions, lists**

`QuickActions.tsx`:

```tsx
import Link from 'next/link';
import { Package, ClipboardList, Ticket, Image as ImageIcon, Ruler, RefreshCw } from 'lucide-react';

const ACTIONS = [
  { label: 'Add Product', href: '/admin/products', icon: Package },
  { label: 'Manage Orders', href: '/admin/orders', icon: ClipboardList },
  { label: 'Create Coupon', href: '/admin/coupons', icon: Ticket },
  { label: 'Add Banner', href: '/admin/banners', icon: ImageIcon },
  { label: 'Add Size Chart', href: '/admin/size-charts', icon: Ruler },
  { label: 'Refresh Feed', href: '/admin/product-feed', icon: RefreshCw },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {ACTIONS.map(({ label, href, icon: Icon }) => (
        <Link key={label} href={href} className="flex flex-col items-center gap-2 rounded-lg border border-[#EEEEEE] bg-white px-2 py-4 text-center text-xs font-medium hover:border-black">
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </div>
  );
}
```

`LowStockList.tsx`:

```tsx
import Link from 'next/link';
import type { StockProduct } from '@/features/admin/analytics/domain/analytics';

export default function LowStockList({ items }: { items: StockProduct[] }) {
  if (items.length === 0) return <p className="text-sm text-[#717171]">All products are well stocked.</p>;
  return (
    <ul className="divide-y divide-[#EEEEEE]">
      {items.map((p) => (
        <li key={p.id} className="flex items-center gap-3 py-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt="" className="h-11 w-11 rounded object-cover" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{p.name}</div>
            <div className="text-xs font-semibold text-emerald-600">{p.stock} in stock</div>
          </div>
          <Link href="/admin/products" className="rounded border border-[#EEEEEE] px-3 py-1.5 text-xs font-medium hover:border-black">Edit</Link>
        </li>
      ))}
    </ul>
  );
}
```

`RecentOrdersTable.tsx`:

```tsx
import type { Order, OrderStatus } from '@/shared/domain/types';
import { STATUS_LABELS } from '@/features/admin/analytics/domain/analytics';
import { formatCurrency } from '@/shared/lib/formatCurrency';

const BADGE: Record<OrderStatus, string> = {
  pending: 'bg-red-50 text-red-700', confirmed: 'bg-amber-50 text-amber-800',
  out_for_delivery: 'bg-blue-50 text-blue-700', delivered: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-neutral-100 text-neutral-600',
};

export default function RecentOrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) return <p className="text-sm text-[#717171]">No orders in this period.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs text-[#717171]">
          <tr><th className="py-2 font-medium">#</th><th className="font-medium">Customer</th><th className="font-medium">Items</th><th className="font-medium">Amount</th><th className="font-medium">Status</th><th className="font-medium">Date</th></tr>
        </thead>
        <tbody className="divide-y divide-[#EEEEEE]">
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="py-3 font-medium underline">#{o.id.slice(-8)}</td>
              <td>{o.userName}</td>
              <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
              <td>{formatCurrency(o.totalAmount)}</td>
              <td><span className={`rounded px-2 py-1 text-xs font-medium ${BADGE[o.status]}`}>{STATUS_LABELS[o.status]}</span></td>
              <td className="text-[#717171]">{new Date(o.createdAt).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

`TopSellers.tsx`:

```tsx
import type { TopProduct } from '@/features/admin/analytics/domain/analytics';

export default function TopSellers({ items }: { items: TopProduct[] }) {
  if (items.length === 0) return <p className="text-sm text-[#717171]">No sales in this period.</p>;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((p, i) => (
        <div key={p.productId}>
          <div className="relative aspect-[4/5] overflow-hidden rounded bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
            <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs font-bold text-white">{i + 1}</span>
          </div>
          <div className="mt-2 truncate text-sm font-medium">{p.name}</div>
          <div className="text-xs font-semibold">{p.sold} sold</div>
        </div>
      ))}
    </div>
  );
}
```

`RecentActivity.tsx`:

```tsx
import { formatRelativeTime, type ActivityEvent } from '@/features/admin/analytics/domain/analytics';

export default function RecentActivity({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-[#717171]">No activity yet.</p>;
  return (
    <ul className="divide-y divide-[#EEEEEE]">
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-3 py-2.5">
          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${e.kind === 'order' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
          <div className="min-w-0 flex-1">
            <div className="text-sm">{e.title}</div>
            <div className="text-xs text-[#717171]">{e.detail}</div>
          </div>
          <span className="shrink-0 text-xs text-[#717171]">{formatRelativeTime(e.at)}</span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: `DashboardPage.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Coins, Package, Users, RefreshCw } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import AdminCard from '@/features/admin/presentation/AdminCard';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import {
  lastNDays, previousRange, computeStats, percentChange, filterOrdersByRange, countByStatus,
  dailySales, topProducts, lowStockProducts, recentActivity,
} from '@/features/admin/analytics/domain/analytics';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import Spinner from '@/shared/ui/Spinner';
import { useAuth } from '@/features/auth/presentation/AuthProvider';
import StatCard from './StatCard';
import SalesChart from './SalesChart';
import StatusDonut from './StatusDonut';
import QuickActions from './QuickActions';
import LowStockList from './LowStockList';
import RecentOrdersTable from './RecentOrdersTable';
import TopSellers from './TopSellers';
import RecentActivity from './RecentActivity';

const RANGES = [{ label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }, { label: 'Last 90 days', days: 90 }];

export default function DashboardPage() {
  const { user } = useAuth();
  const { orders, products, loading, error, reload } = useAdminData({ products: true });
  const [days, setDays] = useState(7);

  const view = useMemo(() => {
    const range = lastNDays(days);
    const prev = previousRange(range);
    const cur = computeStats(orders, range);
    const old = computeStats(orders, prev);
    const inWindow = filterOrdersByRange(orders, range);
    return {
      cur,
      change: {
        orders: percentChange(cur.totalOrders, old.totalOrders),
        sales: percentChange(cur.totalSales, old.totalSales),
        sold: percentChange(cur.productsSold, old.productsSold),
        customers: percentChange(cur.newCustomers, old.newCustomers),
      },
      statusCounts: countByStatus(inWindow),
      series: dailySales(orders, range),
      recent: inWindow.slice(0, 5),
      top: topProducts(inWindow, 5),
      lowStock: lowStockProducts(products, 10, 5),
      activity: recentActivity(orders, 5),
    };
  }, [orders, products, days]);

  const firstName = user?.displayName?.split(' ')[0] ?? 'there';

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${firstName}! Here's what's happening with your store today.`}
        actions={
          <>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-md border border-[#EEEEEE] bg-white px-3 py-2 text-sm" aria-label="Date range">
              {RANGES.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}
            </select>
            <button type="button" onClick={reload} className="rounded-md border border-[#EEEEEE] bg-white p-2" aria-label="Reload"><RefreshCw className="h-4 w-4" /></button>
          </>
        }
      />

      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          Couldn&apos;t load dashboard data: {error}{' '}
          <button type="button" onClick={reload} className="font-bold underline">Retry</button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={ShoppingCart} label="Total Orders" value={String(view.cur.totalOrders)} change={view.change.orders} />
            <StatCard icon={Coins} label="Total Sales" value={formatCurrency(view.cur.totalSales)} change={view.change.sales} />
            <StatCard icon={Package} label="Products Sold" value={String(view.cur.productsSold)} change={view.change.sold} />
            <StatCard icon={Users} label="New Customers" value={String(view.cur.newCustomers)} change={view.change.customers} />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <div className="grid gap-6 lg:grid-cols-5">
                <AdminCard title="Sales Overview" className="lg:col-span-3"><SalesChart data={view.series} /></AdminCard>
                <AdminCard title="Orders by Status" className="lg:col-span-2"><StatusDonut counts={view.statusCounts} /></AdminCard>
              </div>
              <AdminCard title="Recent Orders" action={<Link href="/admin/orders" className="text-xs underline">View All</Link>}>
                <RecentOrdersTable orders={view.recent} />
              </AdminCard>
              <AdminCard title="Top Selling Products" action={<Link href="/admin/reports/products" className="text-xs underline">View All</Link>}>
                <TopSellers items={view.top} />
              </AdminCard>
            </div>
            <div className="space-y-6">
              <AdminCard title="Quick Actions"><QuickActions /></AdminCard>
              <AdminCard title="Low Stock Products" action={<Link href="/admin/products" className="text-xs underline">View All</Link>}>
                <LowStockList items={view.lowStock} />
              </AdminCard>
              <AdminCard title="Recent Activity"><RecentActivity events={view.activity} /></AdminCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

Check `User` from `authListener` exposes `displayName`; if its field is named differently (open `src/features/auth/infrastructure/authListener.ts`), use that name.

- [ ] **Step 6: Route**

`src/app/admin/page.tsx`:

```tsx
'use client';

import DashboardPage from '@/features/admin/dashboard/presentation/DashboardPage';

export default function AdminPage() {
  return <DashboardPage />;
}
```

- [ ] **Step 7: Verify and commit**

Run: `npm run lint && npm test` — Expected: pass. Open `/admin` in the browser (desktop + 375px): stat cards, chart hover, donut, widgets all render with live data; empty-state text shows when range has no orders; range selector changes figures.

```bash
git add src/features/admin/dashboard src/app/admin/page.tsx
git commit -m "feat(admin): add dashboard home with stats, chart and widgets"
```

---

### Task 5: Restyle existing admin pages

**Files:**
- Modify: `src/features/admin/{inventory,orders,coupons,banners,parentProducts,sizeCharts,productFeed}/presentation/*Manager.tsx` (and `BannerForm.tsx`)

**Interfaces:**
- Consumes: `AdminPageHeader`, `AdminCard` from Task 3.

- [ ] **Step 1: Soften corners across admin features**

Run:

```bash
grep -rl "rounded-none" src/features/admin --include=*.tsx | grep -v "/dashboard/" | xargs sed -i '' 's/rounded-none/rounded-lg/g'
```

Expected: no output; `git diff --stat` shows only admin presentation files.

- [ ] **Step 2: Add a page header to each manager**

For each manager, open the file and find its top-level title/heading block (the first `<h2>`/`<h3>` above the content, plus its sibling action buttons). Replace that block with `<AdminPageHeader title="…" subtitle="…" actions={<existing buttons/>} />`, keeping the buttons and handlers unchanged. Titles/subtitles:

| File | Title | Subtitle |
|---|---|---|
| `InventoryManager.tsx` | Products | Manage your catalog, pricing and images. |
| `AdminOrderManager.tsx` | All Orders | Review orders and update their status. |
| `CouponManager.tsx` | Coupons | Create and manage discount codes. |
| `BannerManager.tsx` | Banners | Manage the home page banners. |
| `ParentProductManager.tsx` | Parent Products | Manage pooled sizes and stock. |
| `SizeChartManager.tsx` | Size Charts | Reusable size chart templates. |
| `ProductFeedManager.tsx` | Product Feed | Review and refresh your product feed. |

Wrap the manager's main list/table block in `<AdminCard>` where it is a bare bordered `div`.

- [ ] **Step 3: Verify**

Run: `npm run lint && npm test` — Expected: pass. In the browser, visit each of the seven pages at desktop and 375px width: header shows, no clipped tables (add `overflow-x-auto` to any table wrapper that overflows), create/edit/delete flows still work on Orders (status change) and Coupons (open the create form).

- [ ] **Step 4: Commit**

```bash
git add src/features/admin
git commit -m "feat(admin): restyle existing admin pages to new design"
```

---

### Task 6: Customers, reports, coupon usage, shipping zones

**Files:**
- Create: `src/features/admin/customers/presentation/CustomersPage.tsx`
- Create: `src/features/admin/reports/presentation/{SalesReportPage,ProductPerformancePage,CustomerInsightsPage}.tsx`
- Create: `src/features/admin/coupons/presentation/CouponUsageHistory.tsx`
- Create: `src/features/admin/shipping/presentation/ShippingZonesPage.tsx`
- Create routes: `src/app/admin/customers/page.tsx`, `reports/sales/page.tsx`, `reports/products/page.tsx`, `reports/customers/page.tsx`, `coupons/usage/page.tsx`, `shipping/page.tsx` (each `'use client'`, returns its page component)
- Test: add to `analytics.test.ts` cases for `customerInsights` (below)
- Modify: `analytics.ts` (add `customerInsights`)

**Interfaces:**
- Produces: `customerInsights(orders: Order[], range: DateRange): { newCustomers: number; returningCustomers: number; topSpenders: CustomerSummary[] }` — a customer is "returning" if they have ≥1 order in range AND their first order is before `range.from`; "new" if their first order falls in range.

- [ ] **Step 1: Failing test**

```ts
describe('customerInsights', () => {
  it('splits new vs returning within the range and lists top spenders', () => {
    const orders = [
      order({ id: 'a', userId: 'u1', createdAt: '2026-10-01T10:00:00', totalAmount: 100 }),
      order({ id: 'b', userId: 'u1', createdAt: '2026-10-27T10:00:00', totalAmount: 100 }),
      order({ id: 'c', userId: 'u2', createdAt: '2026-10-26T10:00:00', totalAmount: 500 }),
    ];
    const r = customerInsights(orders, lastNDays(7, now));
    expect(r.newCustomers).toBe(1);
    expect(r.returningCustomers).toBe(1);
    expect(r.topSpenders[0].key).toBe('u2');
  });
});
```

Add `customerInsights` to the test file's import list. Run `npx vitest run src/features/admin/analytics` — Expected: FAIL.

- [ ] **Step 2: Implement (append to `analytics.ts`)**

```ts
export function customerInsights(orders: Order[], range: DateRange) {
  const customers = buildCustomers(orders);
  const activeKeys = new Set(filterOrdersByRange(orders, range).map((o) => o.userId));
  let newCustomers = 0;
  let returningCustomers = 0;
  for (const c of customers) {
    if (!activeKeys.has(c.key)) continue;
    const first = new Date(c.firstOrderAt).getTime();
    if (first >= range.from.getTime() && first <= range.to.getTime()) newCustomers++;
    else if (first < range.from.getTime()) returningCustomers++;
  }
  const topSpenders = customers.filter((c) => activeKeys.has(c.key)).slice(0, 10);
  return { newCustomers, returningCustomers, topSpenders };
}
```

Run again — Expected: PASS.

- [ ] **Step 3: `CustomersPage.tsx`**

Uses `useAdminData()`, `buildCustomers`, a search input filtering name/email/phone, `AdminPageHeader title="Customers"`, and an `AdminCard` with a table: Name, Email, Phone, Orders, Total Spent (`formatCurrency`), Last Order (`toLocaleDateString`). Loading → `Spinner`; error → red box with Retry (same markup as the dashboard); empty → `EmptyState` from `@/shared/ui/EmptyState` with icon `Users`.

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Users, Search } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import AdminCard from '@/features/admin/presentation/AdminCard';
import EmptyState from '@/shared/ui/EmptyState';
import Spinner from '@/shared/ui/Spinner';
import { useAdminData } from '@/features/admin/analytics/application/useAdminData';
import { buildCustomers } from '@/features/admin/analytics/domain/analytics';
import { formatCurrency } from '@/shared/lib/formatCurrency';

export default function CustomersPage() {
  const { orders, loading, error, reload } = useAdminData();
  const [q, setQ] = useState('');
  const customers = useMemo(() => buildCustomers(orders), [orders]);
  const rows = customers.filter((c) => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <AdminPageHeader title="Customers" subtitle="Everyone who has placed an order." />
      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {error} <button type="button" onClick={reload} className="font-bold underline">Retry</button>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" description="Customers appear here after their first order." />
      ) : (
        <AdminCard>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone"
              className="w-full rounded-md border border-[#EEEEEE] py-2 pl-9 pr-3 text-sm" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-[#717171]">
                <tr><th className="py-2 font-medium">Name</th><th className="font-medium">Email</th><th className="font-medium">Phone</th><th className="font-medium">Orders</th><th className="font-medium">Total Spent</th><th className="font-medium">Last Order</th></tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE]">
                {rows.map((c) => (
                  <tr key={c.key}>
                    <td className="py-3 font-medium">{c.name}</td><td>{c.email || '—'}</td><td>{c.phone}</td>
                    <td>{c.orderCount}</td><td>{formatCurrency(c.totalSpent)}</td>
                    <td className="text-[#717171]">{new Date(c.lastOrderAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Report pages**

Each follows the `CustomersPage` loading/error skeleton and has the same range `<select>` (7/30/90) as the dashboard.
- `SalesReportPage` (`useAdminData()`): stat row from `computeStats` (orders, sales, products sold), `SalesChart` of `dailySales`, and a table of daily rows (date, total) in reverse order. Import `SalesChart` from `@/features/admin/dashboard/presentation/SalesChart`.
- `ProductPerformancePage` (`useAdminData()`): table from `topProducts(filterOrdersByRange(orders, range), 50)` with columns Rank, Product (image + name), Units Sold, Revenue.
- `CustomerInsightsPage` (`useAdminData()`): two `StatCard`s from `customerInsights` (New, Returning; `change` = `null`) and a Top Spenders table (Name, Orders, Total Spent). Import `StatCard` from the dashboard folder.

- [ ] **Step 5: `CouponUsageHistory.tsx`**

Loads `listAllCoupons()` (`@/features/admin/coupons/infrastructure/firestoreCouponAdminRepository`) in an effect (same loading/error skeleton). Table sorted by `usageCount` desc: Code, Type (`discountType`), Value, Used (`usageCount` / `usageLimit ?? '∞'`), Status (Active if `isActive` else Inactive; "Expired" if `isCouponExpired(coupon)` from `@/features/coupons/domain/coupon`). Header title "Usage History".

- [ ] **Step 6: `ShippingZonesPage.tsx`**

Read-only, from the constants in `@/features/checkout/domain/pricing`:

```tsx
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
```

- [ ] **Step 7: Routes, verify, commit**

Create the six route files (`'use client'; import X from '…'; export default function Page() { return <X />; }`).

Run: `npm run lint && npm test` — Expected: pass. Visit each of the six routes in the browser; confirm the sidebar highlights correctly (including `/admin/coupons` vs `/admin/coupons/usage`) and each page renders data.

```bash
git add src/features/admin src/app/admin
git commit -m "feat(admin): customers, reports, coupon usage and shipping zones pages"
```

---

### Task 7: Order Returns (migration + page)

**Files:**
- Create: `supabase/migrations/20261027000100_order_returns.sql`
- Create: `src/features/admin/returns/infrastructure/orderReturnsRepository.ts`
- Create: `src/features/admin/returns/domain/orderReturn.ts` (+ `orderReturn.test.ts`)
- Create: `src/features/admin/returns/presentation/OrderReturnsPage.tsx`, `src/app/admin/returns/page.tsx`

**Interfaces:**
- Produces: `type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'refunded'`, `RETURN_STATUS_LABELS`, `NEXT_RETURN_STATUSES(status): ReturnStatus[]`, `interface OrderReturn { id; orderId; reason; status; createdAt; updatedAt }`, repo functions `listReturns()`, `createReturn(orderId, reason)`, `updateReturnStatus(id, status)`.

- [ ] **Step 1: Migration**

```sql
-- supabase/migrations/20261027000100_order_returns.sql
create table order_returns (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id) on delete cascade,
  reason text not null default '',
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_returns_order_id_idx on order_returns(order_id);

alter table order_returns enable row level security;
create policy order_returns_admin_all on order_returns for all using (is_admin()) with check (is_admin());
```

Apply with the Supabase MCP `apply_migration` (project `kixvsiyrrmbwyqpenqqe`) only after confirming with the user (it changes the live database). Do not apply it silently.

- [ ] **Step 2: Failing domain test**

```ts
// orderReturn.test.ts
import { describe, it, expect } from 'vitest';
import { NEXT_RETURN_STATUSES } from './orderReturn';

describe('NEXT_RETURN_STATUSES', () => {
  it('requested can be approved or rejected', () => expect(NEXT_RETURN_STATUSES('requested')).toEqual(['approved', 'rejected']));
  it('approved can be refunded', () => expect(NEXT_RETURN_STATUSES('approved')).toEqual(['refunded']));
  it('rejected and refunded are terminal', () => {
    expect(NEXT_RETURN_STATUSES('rejected')).toEqual([]);
    expect(NEXT_RETURN_STATUSES('refunded')).toEqual([]);
  });
});
```

Run `npx vitest run src/features/admin/returns` — Expected: FAIL.

- [ ] **Step 3: Domain + repository**

```ts
// orderReturn.ts
export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'refunded';

export interface OrderReturn {
  id: string; orderId: string; reason: string; status: ReturnStatus; createdAt: string; updatedAt: string;
}

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: 'Requested', approved: 'Approved', rejected: 'Rejected', refunded: 'Refunded',
};

export function NEXT_RETURN_STATUSES(status: ReturnStatus): ReturnStatus[] {
  if (status === 'requested') return ['approved', 'rejected'];
  if (status === 'approved') return ['refunded'];
  return [];
}
```

```ts
// orderReturnsRepository.ts
import { supabase } from '@/shared/infrastructure/supabase/client';
import type { OrderReturn, ReturnStatus } from '../domain/orderReturn';

function toReturn(row: Record<string, any>): OrderReturn {
  return { id: row.id, orderId: row.order_id, reason: row.reason, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function listReturns(): Promise<OrderReturn[]> {
  const { data, error } = await supabase.from('order_returns').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(toReturn);
}

export async function createReturn(orderId: string, reason: string): Promise<void> {
  const { error } = await supabase.from('order_returns').insert({ order_id: orderId, reason });
  if (error) throw new Error(error.message);
}

export async function updateReturnStatus(id: string, status: ReturnStatus): Promise<void> {
  const { error } = await supabase.from('order_returns').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}
```

Run the domain test again — Expected: PASS.

- [ ] **Step 4: `OrderReturnsPage.tsx`**

Client component with the standard loading/error skeleton: loads `listReturns()`; header "Order Returns" with a "Log Return" button toggling an inline form (order number input accepting the full order id or the last-8 suffix, resolved against `useAdminData().orders` via `o.id === v || o.id.endsWith(v)`; reason textarea; submit calls `createReturn(order.id, reason)` then reloads; show an inline error if no order matches). Table: Order (`#` + last 8), Reason, Status badge (`RETURN_STATUS_LABELS`), Date, and action buttons from `NEXT_RETURN_STATUSES(status)` that call `updateReturnStatus` then reload (show `alert('Failed to update return.')` on failure, matching `AdminOrderManager`). `EmptyState` (icon `RotateCcw`) when none. Route file `src/app/admin/returns/page.tsx` renders it.

- [ ] **Step 5: Verify and commit**

Run: `npm run lint && npm test` — Expected: pass. After the migration is applied (with user's go-ahead): log a return against a real order, move it requested→approved→refunded, and confirm terminal states show no buttons.

```bash
git add supabase/migrations src/features/admin/returns src/app/admin/returns
git commit -m "feat(admin): order returns table and page"
```

---

## Self-Review

- **Spec coverage:** shell + sidebar + mobile drawer + badge (Task 3); dashboard + all widgets + in-page range selector (Task 4); restyle existing pages (Task 5); Customers, Sales Report, Product Performance, Customer Insights, Usage History, Shipping Zones (Task 6); Order Returns + migration (Task 7); analytics unit tests (Tasks 1, 6, 7); status label mapping (Task 1); non-goals excluded from nav (Task 3).
- **Type consistency:** `DateRange`, `CustomerSummary`, `TopProduct`, `StockProduct`, `ActivityEvent`, `useAdminData`, `AdminPageHeader`, `AdminCard`, `StatCard`, `SalesChart` names match across tasks. `STATUS_COLORS` is exported from `StatusDonut.tsx` only.
- **Known judgement calls to verify during execution:** Navbar height for the sticky sidebar (Task 3 Step 7); `User.displayName` field name (Task 4 Step 5); the heading blocks in the seven managers (Task 5 Step 2) are located by reading each file.
