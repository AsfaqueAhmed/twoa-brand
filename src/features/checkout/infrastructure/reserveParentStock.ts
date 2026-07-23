import { doc, runTransaction, type DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { CartItem } from '@/shared/domain/types';

interface StockLine {
  parentId: string;
  size: string;
  qty: number;
}

export async function reserveStockForOrder(cartItems: CartItem[]): Promise<void> {
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
    needed.set(key, { parentId, size: item.selectedSize, qty: (prev?.qty ?? 0) + item.quantity });
  }

  const lines = Array.from(needed.values()).map((line) => ({
    ...line,
    ref: doc(db, 'parentProducts', line.parentId, 'sizeStock', line.size),
  }));

  if (lines.length === 0) return;

  await runTransaction(db, async (tx) => {
    const snaps: DocumentSnapshot[] = [];
    for (const line of lines) {
      snaps.push(await tx.get(line.ref));
    }

    lines.forEach((line, i) => {
      const current = Number(snaps[i].data()?.stock) || 0;
      if (current < line.qty) {
        throw new Error(`Only ${current} left in size ${line.size}. Please adjust your cart.`);
      }
    });

    lines.forEach((line, i) => {
      const current = Number(snaps[i].data()?.stock) || 0;
      tx.update(line.ref, { stock: current - line.qty });
    });
  });
}
