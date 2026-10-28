'use client';

import { useState } from 'react';
import { newCustomItemId, type DraftLine } from '../domain/adminOrder';

const INPUT = 'w-full rounded-md border border-[#EEEEEE] bg-white px-3 py-2 text-sm focus:border-black focus:outline-none';

export default function CustomItemForm({ onAdd }: { onAdd: (line: Extract<DraftLine, { kind: 'custom' }>) => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0');
  const [quantity, setQuantity] = useState('1');

  const add = () => {
    onAdd({
      kind: 'custom',
      id: newCustomItemId(),
      name: name.trim(),
      price: Math.max(0, Number(price) || 0),
      quantity: Math.max(1, Math.floor(Number(quantity) || 1)),
    });
    setName('');
    setPrice('0');
    setQuantity('1');
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_90px_auto] sm:items-end">
      <label className="text-xs text-[#717171]">
        Item name
        <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gift wrap" />
      </label>
      <label className="text-xs text-[#717171]">
        Unit price
        <input type="number" min={0} className={INPUT} value={price} onChange={(e) => setPrice(e.target.value)} />
      </label>
      <label className="text-xs text-[#717171]">
        Quantity
        <input type="number" min={1} className={INPUT} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </label>
      <button
        type="button"
        onClick={add}
        disabled={!name.trim()}
        className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        Add custom item
      </button>
    </div>
  );
}
