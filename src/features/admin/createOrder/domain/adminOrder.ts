import type { CartItem } from '@/shared/domain/types';
import { computeTotal } from '@/features/checkout/domain/pricing';
import { buildOrderItemPayload } from '@/features/checkout/domain/orderItemPayload';
import { buildStockLines, type StockLine } from '@/features/checkout/infrastructure/reserveParentStock';

export type DraftLine =
  | { kind: 'catalog'; item: CartItem }
  | { kind: 'custom'; id: string; name: string; price: number; quantity: number };

export function lineSubtotal(line: DraftLine): number {
  return line.kind === 'catalog' ? line.item.product.price * line.item.quantity : line.price * line.quantity;
}

export function draftSubtotal(lines: DraftLine[]): number {
  return lines.reduce((sum, l) => sum + lineSubtotal(l), 0);
}

export function newCustomItemId(): string {
  const hex = Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `custom_${hex}`;
}

export function adminOrderTotal(params: { subtotal: number; deliveryFee: number; discount: number }): number {
  const { subtotal, deliveryFee } = params;
  const discount = Math.min(Math.max(params.discount, 0), subtotal + deliveryFee);
  return computeTotal(subtotal, deliveryFee, discount);
}

export function formatAdminAddress(p: { street: string; thana: string; cityCorp: string; district: string; division: string }): string {
  return [p.street.trim(), p.thana, p.cityCorp, p.district, p.division, 'Bangladesh'].filter(Boolean).join(', ');
}

export function buildAdminOrderItems(lines: DraftLine[]): { items: Record<string, any>[]; cartLines: StockLine[] } {
  const items = lines.map((l) =>
    l.kind === 'catalog'
      ? buildOrderItemPayload(l.item)
      : { productId: l.id, name: l.name.trim(), price: l.price, quantity: l.quantity, image_url: '' },
  );
  const catalogItems = lines.flatMap((l) => (l.kind === 'catalog' ? [l.item] : []));
  return { items, cartLines: buildStockLines(catalogItems) };
}

export function validateDraft(d: { name: string; phone: string; address: string; lines: DraftLine[] }): string | null {
  if (!d.name.trim()) return 'Customer name is required.';
  if (!d.phone.trim()) return 'Phone number is required.';
  if (!d.address.trim()) return 'Delivery address is required.';
  if (d.address.length > 500) return 'Address is too long. Maximum length is 500 characters.';
  if (d.lines.length === 0) return 'Add at least one item.';
  for (const l of d.lines) {
    if (l.kind === 'custom') {
      if (!l.name.trim()) return 'Every custom item needs a name.';
      if (l.price < 0 || Number.isNaN(l.price)) return 'Custom item prices cannot be negative.';
    }
    const qty = l.kind === 'catalog' ? l.item.quantity : l.quantity;
    if (!Number.isInteger(qty) || qty < 1) return 'Quantities must be at least 1.';
  }
  return null;
}

// Adds a catalog item to the draft, summing quantity into an existing line of the same product+size+variant.
export function addCatalogLine(lines: DraftLine[], item: CartItem): DraftLine[] {
  const idx = lines.findIndex(
    (l) =>
      l.kind === 'catalog' &&
      l.item.product.id === item.product.id &&
      l.item.selectedSize === item.selectedSize &&
      l.item.selectedVariant?.id === item.selectedVariant?.id,
  );
  if (idx === -1) return [...lines, { kind: 'catalog', item }];
  return lines.map((l, i) =>
    i === idx && l.kind === 'catalog' ? { kind: 'catalog', item: { ...l.item, quantity: l.item.quantity + item.quantity } } : l,
  );
}
