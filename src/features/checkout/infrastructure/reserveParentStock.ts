import type { CartItem } from '@/shared/domain/types';

export interface StockLine {
  parent_id: string;
  size: string;
  qty: number;
}

// Validates each cart line and aggregates duplicate (parentId, size) pairs
// into one line — the place_order RPC assumes lines are already deduped
// (see supabase/migrations/20260802191915_init_schema.sql), since it
// validates stock against a snapshot taken once per line. Actual stock
// locking/decrementing now happens server-side inside that RPC.
export function buildStockLines(cartItems: CartItem[]): StockLine[] {
  const needed = new Map<string, StockLine>();
  for (const item of cartItems) {
    const parentId = item.product.parentProductId;
    if (!parentId) {
      throw new Error(`"${item.product.name}" is no longer available and must be removed from your cart.`);
    }
    if (!item.selectedSize) {
      throw new Error(`Please select a size for "${item.product.name}" before checking out.`);
    }
    const key = `${parentId}::${item.selectedSize}`;
    const prev = needed.get(key);
    needed.set(key, { parent_id: parentId, size: item.selectedSize, qty: (prev?.qty ?? 0) + item.quantity });
  }
  return Array.from(needed.values());
}
