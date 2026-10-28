'use client';

import { useMemo, useState } from 'react';
import { useCustomTeeData } from '../application/useCustomTeeData';
import { EMPTY_SELECTION, type Selection, type SelectionStep, validateSelection } from '../domain/selection';
import { buildParentCard } from '../domain/cards';
import Modal from './Modal';
import Stepper from './Stepper';
import SelectionStepOne from './SelectionStepOne';
import SelectionStepTwo from './SelectionStepTwo';

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

export default function CustomTeeModal({ onClose }: { onClose: () => void }) {
  const { parents, products, loading, error, refreshParents } = useCustomTeeData();
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [step, setStep] = useState<1 | 2>(1);
  const [handedOff, setHandedOff] = useState<Selection | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const card = useMemo(() => {
    if (!handedOff) return null;
    const parent = parents.find((p) => p.id === handedOff.parentId);
    return parent ? buildParentCard(parent, products, handedOff.size) : null;
  }, [parents, products, handedOff]);

  const onChange = (s: Selection) => {
    setNotice(null);
    setSelection(s);
  };

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
        setStep(result.resetTo === 'parent' ? 2 : 1);
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

  let body: React.ReactNode;
  if (loading) {
    body = <p className="py-10 text-center text-sm text-[#717171]">Loading tees…</p>;
  } else if (error) {
    body = <p role="alert" className="py-10 text-center text-sm text-red-600">{error}</p>;
  } else if (handedOff && card) {
    body = (
      <div className="flex flex-1 flex-col space-y-5">
        <h2 className="text-center text-sm font-bold uppercase tracking-widest text-black">Tee selected</h2>
        <ul className="space-y-1 text-sm text-black">
          <li>Tee: {card.parent.name} (SKU {card.code})</li>
          <li>Category: {card.parent.category} / {card.parent.subcategory}</li>
          <li>Size: {handedOff.size}</li>
        </ul>
        {/* Phase C: the Design Studio opens here with this parent and size. */}
        <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">
          The Design Studio is coming soon. Your selection is saved for this session.
        </p>
        <div className="sticky bottom-0 mt-auto flex gap-3 bg-white pb-6 pt-8">
          <button
            type="button"
            onClick={() => setHandedOff(null)}
            className="rounded-lg border border-[#EEEEEE] px-8 py-3.5 text-[11px] font-bold uppercase tracking-widest text-black hover:border-black"
          >
            Change tee
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg bg-black px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#333333]"
          >
            Close
          </button>
        </div>
      </div>
    );
  } else {
    body = (
      <>
        <Stepper step={step} />
        {notice && <p role="alert" className="mb-5 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">{notice}</p>}
        {step === 1 ? (
          <SelectionStepOne parents={parents} selection={selection} onChange={onChange} onNext={() => setStep(2)} />
        ) : (
          <SelectionStepTwo
            parents={parents}
            products={products}
            selection={selection}
            onChange={onChange}
            onBack={() => setStep(1)}
            onContinue={onContinue}
            busy={busy}
          />
        )}
      </>
    );
  }

  return (
    <Modal onClose={onClose} title="Design your tee">
      {!handedOff && <h2 className="mb-6 text-center text-sm font-bold uppercase tracking-widest text-black">Design your tee</h2>}
      {body}
    </Modal>
  );
}
