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
