'use client';

import { useMemo, useState } from 'react';
import { useCustomTeeData } from '../application/useCustomTeeData';
import { EMPTY_SELECTION, type Selection, type SelectionStep, validateSelection } from '../domain/selection';
import { buildParentCard } from '../domain/cards';
import SelectionWizard from './SelectionWizard';

const HANDOFF_KEY = 'custom-tee-selection';

// Clears the selection from the step that became invalid onward.
function truncateSelection(sel: Selection, resetTo: SelectionStep): Selection {
  const keep: Record<SelectionStep, (keyof Selection)[]> = {
    category: [],
    subcategory: ['category'],
    size: ['category', 'subcategory'],
    parent: ['category', 'subcategory', 'size'],
  };
  const next = { ...EMPTY_SELECTION };
  for (const k of keep[resetTo]) next[k] = sel[k];
  return next;
}

export default function CustomTeeFlow() {
  const { parents, products, loading, error, refreshParents } = useCustomTeeData();
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [handedOff, setHandedOff] = useState<Selection | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const card = useMemo(() => {
    if (!handedOff) return null;
    const parent = parents.find((p) => p.id === handedOff.parentId);
    return parent ? buildParentCard(parent, products, handedOff.size) : null;
  }, [parents, products, handedOff]);

  // Re-reads stock; on failure clears the invalid steps and shows a message. Never writes stock.
  const onContinue = async () => {
    const current = selection;
    setBusy(true);
    try {
      const fresh = await refreshParents();
      const result = validateSelection(fresh, current);
      if (!result.ok) {
        setSelection(truncateSelection(current, result.resetTo));
        setNotice(result.reason);
        return;
      }
      setNotice(null);
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ parentProductId: current.parentId, size: current.size }));
      setHandedOff(current);
    } catch {
      setNotice('Could not check stock. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="px-4 py-16 text-center text-sm text-[#717171]">Loading tees…</p>;
  if (error) return <p role="alert" className="px-4 py-16 text-center text-sm text-red-600">{error}</p>;

  if (handedOff && card) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-12">
        <h1 className="text-xl font-bold uppercase tracking-wider text-black">Tee selected</h1>
        <ul className="space-y-1 text-sm text-black">
          <li>Tee: {card.parent.name} (SKU {card.code})</li>
          <li>Category: {card.parent.category} / {card.parent.subcategory}</li>
          <li>Size: {handedOff.size}</li>
        </ul>
        {/* Phase C: the Design Studio opens here with this parent and size. */}
        <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">
          The Design Studio is coming soon. Your selection is saved for this session.
        </p>
        <button type="button" onClick={() => setHandedOff(null)} className="text-xs font-bold uppercase tracking-widest text-black underline">
          Change tee
        </button>
      </div>
    );
  }

  return (
    <SelectionWizard
      parents={parents}
      products={products}
      selection={selection}
      onChange={(s) => { setNotice(null); setSelection(s); }}
      onContinue={onContinue}
      notice={notice}
      busy={busy}
    />
  );
}
