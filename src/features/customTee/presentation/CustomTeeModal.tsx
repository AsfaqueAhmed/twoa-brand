'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomTeeData } from '../application/useCustomTeeData';
import { EMPTY_SELECTION, type Selection, type SelectionStep, validateSelection } from '../domain/selection';
import { HANDOFF_KEY } from '../domain/studioTarget';
import Modal from './Modal';
import Stepper from './Stepper';
import SelectionStepOne from './SelectionStepOne';
import SelectionStepTwo from './SelectionStepTwo';

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
  const router = useRouter();
  const { parents, products, loading, error, refreshParents } = useCustomTeeData();
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [step, setStep] = useState<1 | 2>(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      try {
        sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ parentProductId: current.parentId, size: current.size }));
      } catch {
        // storage full/unavailable: the studio also receives the tee and size via query params
      }
      onClose();
      router.push(`/custom-tee/studio?tee=${encodeURIComponent(current.parentId)}&size=${encodeURIComponent(current.size)}`);
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
      <h2 className="mb-6 text-center text-sm font-bold uppercase tracking-widest text-black">Design your tee</h2>
      {body}
    </Modal>
  );
}
