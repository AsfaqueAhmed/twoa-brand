/** Pure helpers for the admin report screens. */

export const REPORT_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

/** Average order value = sales / orders; 0 when there are no orders. */
export function averageOrderValue(totalSales: number, totalOrders: number): number {
  return totalOrders > 0 ? totalSales / totalOrders : 0;
}

/** Share (0-100, one decimal) of `part` in `total`; 0 when total is not positive. */
export function revenueShare(part: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/** Repeat rate as a whole percent: returning / (new + returning); 0 when no customers. */
export function repeatRate(newCustomers: number, returningCustomers: number): number {
  const active = newCustomers + returningCustomers;
  return active > 0 ? Math.round((returningCustomers / active) * 100) : 0;
}

/** Caption like "+12% vs previous period"; undefined when there is no baseline. */
export function changeCaption(change: number | null): string | undefined {
  if (change === null) return undefined;
  return `${change > 0 ? '+' : ''}${change}% vs previous period`;
}

export function filterByName<T extends { name: string }>(items: T[], search: string): T[] {
  const q = search.trim().toLowerCase();
  return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
}
