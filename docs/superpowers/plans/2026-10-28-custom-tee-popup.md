# Custom Tee Picker as a Popup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-page picker with a popup modal containing a two-step stepper (1 Category & size, 2 Choose tee), opened from the nav "Custom Tee" tab over any page.

**Architecture:** The existing domain/data code is unchanged except for one new pure helper. A generic `Modal` shell hosts a `CustomTeeModal` that orchestrates `SelectionStepOne` and `SelectionStepTwo`. A `CustomTeeProvider` mounted in the root layout exposes `useCustomTee()` (`open/close/isOpen`) and renders the modal only while open (so data loads on demand). `/custom-tee` becomes a landing page that opens the modal on mount.

**Tech Stack:** Next.js 15 app router, React 19, TypeScript, Tailwind 4, lucide-react (`X` icon), Vitest (node env, `src/**/*.test.ts`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-28-custom-tee-design-design.md` (section "Behavior (popup)").
- No migration, no schema change, no stock writes.
- Selection rules unchanged: category change clears subcategory/size/parent; subcategory change clears size/parent; size change clears parent. Eligible stock means `parent.stockBySize[size] > 0`. Only parents with an image are shown (`selectableParents` is applied in `useCustomTeeData`).
- Step 1 = category, subcategory, size; **Next** only when `isStepOneComplete`. Step 2 = tee cards; **Continue to Design Studio** only when `isComplete`.
- Continue re-fetches stock via `refreshParents()`, locks inputs while busy (`<fieldset disabled>`), hands off the *validated* selection, writes `sessionStorage['custom-tee-selection']` = `{"parentProductId": string, "size": string}`.
- Modal behaviors: Escape and backdrop click close; X button closes; body scroll locked while open; `role="dialog"` + `aria-modal`.
- Out of scope: Design Studio, price, cart, artwork storage (later phases).
- Work stays on branch `feat/custom-tee-design`; do not merge or push to main.
- Vitest only runs `src/**/*.test.ts`; component code is verified with `npx tsc --noEmit` and the browser.

## File Structure

- Modify `src/features/customTee/domain/selection.ts` — add `isStepOneComplete`.
- Modify `src/features/customTee/domain/selection.test.ts`
- Create `src/features/customTee/presentation/Modal.tsx` — generic dialog shell.
- Create `src/features/customTee/presentation/Stepper.tsx`
- Create `src/features/customTee/presentation/SelectionStepOne.tsx`
- Create `src/features/customTee/presentation/SelectionStepTwo.tsx`
- Create `src/features/customTee/presentation/CustomTeeModal.tsx` — orchestration.
- Create `src/features/customTee/presentation/CustomTeeProvider.tsx` — context + `useCustomTee`.
- Create `src/features/customTee/presentation/CustomTeeLanding.tsx`
- Modify `src/app/layout.tsx` — mount provider.
- Modify `src/app/custom-tee/page.tsx` — render landing.
- Modify `src/features/catalog/presentation/Navbar.tsx` — Custom tab opens the modal.
- Delete `src/features/customTee/presentation/SelectionWizard.tsx` and `CustomTeeFlow.tsx` (Task 4).

---

### Task 1: Step-one completeness helper

**Files:**
- Modify: `src/features/customTee/domain/selection.ts`
- Test: `src/features/customTee/domain/selection.test.ts`

**Interfaces:**
- Consumes: `Selection` (already in `selection.ts`).
- Produces: `isStepOneComplete(sel: Selection): boolean` — true iff `category`, `subcategory` and `size` are all non-empty (parent not required).

- [ ] **Step 1: Write the failing test** — add `isStepOneComplete` to the existing import from `./selection` and append:

```ts
describe('isStepOneComplete', () => {
  const base = { category: 'T-Shirts', subcategory: 'Graphic', size: 'M', parentId: '' };
  it('is true with category, subcategory and size, even without a parent', () => {
    expect(isStepOneComplete(base)).toBe(true);
    expect(isStepOneComplete({ ...base, parentId: 'a' })).toBe(true);
  });
  it('is false when any of the three is blank', () => {
    expect(isStepOneComplete({ ...base, category: '' })).toBe(false);
    expect(isStepOneComplete({ ...base, subcategory: '' })).toBe(false);
    expect(isStepOneComplete({ ...base, size: '' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/customTee/domain/selection.test.ts`
Expected: FAIL — `isStepOneComplete` is not a function / not exported.

- [ ] **Step 3: Implement** — add next to `isComplete` in `selection.ts`:

```ts
export const isStepOneComplete = (sel: Selection): boolean => !!(sel.category && sel.subcategory && sel.size);
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/customTee/domain/selection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/customTee/domain/selection.ts src/features/customTee/domain/selection.test.ts
git commit -m "feat(custom-tee): isStepOneComplete helper for the two-step popup"
```

---

### Task 2: Modal shell and stepper

**Files:**
- Create: `src/features/customTee/presentation/Modal.tsx`
- Create: `src/features/customTee/presentation/Stepper.tsx`

**Interfaces:**
- Produces:
  - `Modal({ onClose: () => void; title: string; children: React.ReactNode })` — centered dialog on `sm+`, bottom sheet on phones; closes on Escape, backdrop click and the X button; locks body scroll while mounted; focuses the X button on mount.
  - `Stepper({ step }: { step: 1 | 2 })` — two labeled steps ("Category & size", "Choose tee").

- [ ] **Step 1: Write `Modal.tsx`**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type Props = { onClose: () => void; title: string; children: React.ReactNode };

export default function Modal({ onClose, title, children }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Latest onClose without re-running the mount effect (which would reset focus and the saved overflow value).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl"
      >
        <button
          ref={closeRef}
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-black hover:bg-[#F5F5F5]"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="overflow-y-auto px-6 pb-8 pt-10 sm:px-10">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `Stepper.tsx`**

```tsx
const STEPS = ['Category & size', 'Choose tee'];

export default function Stepper({ step }: { step: 1 | 2 }) {
  return (
    <ol aria-label="Progress" className="mb-6 flex items-center justify-center gap-2">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const reached = n <= step;
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                reached ? 'bg-black text-white' : 'bg-[#EEEEEE] text-[#717171]'
              }`}
            >
              {n}
            </span>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${active ? 'text-black' : 'text-[#717171]'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-[#DDDDDD]" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/customTee/presentation/Modal.tsx src/features/customTee/presentation/Stepper.tsx
git commit -m "feat(custom-tee): modal shell and two-step stepper"
```

---

### Task 3: Step components and modal orchestration

**Files:**
- Create: `src/features/customTee/presentation/SelectionStepOne.tsx`
- Create: `src/features/customTee/presentation/SelectionStepTwo.tsx`
- Create: `src/features/customTee/presentation/CustomTeeModal.tsx`

**Interfaces:**
- Consumes: Task 1 `isStepOneComplete`; existing `eligible*`, `select*`, `isComplete`, `validateSelection`, `EMPTY_SELECTION`, `Selection`, `SelectionStep` from `../domain/selection`; `buildParentCard` from `../domain/cards`; `ParentCard` (`{ card, size, selected, onSelect }`); `useCustomTeeData()`; Task 2 `Modal`, `Stepper`.
- Produces:
  - `SelectionStepOne({ parents: ParentProduct[]; selection: Selection; onChange: (s: Selection) => void; onNext: () => void })`
  - `SelectionStepTwo({ parents; products: Product[]; selection; onChange; onBack: () => void; onContinue: () => void; busy: boolean })`
  - `CustomTeeModal({ onClose: () => void })` — default export.

- [ ] **Step 1: Write `SelectionStepOne.tsx`**

```tsx
'use client';

import { useMemo } from 'react';
import type { ParentProduct } from '@/shared/domain/types';
import {
  type Selection,
  eligibleCategories,
  eligibleSubcategories,
  eligibleSizes,
  selectCategory,
  selectSubcategory,
  selectSize,
  isStepOneComplete,
} from '../domain/selection';

type Props = {
  parents: ParentProduct[];
  selection: Selection;
  onChange: (s: Selection) => void;
  onNext: () => void;
};

const FIELD =
  'w-full rounded-2xl border border-[#CDCDCD] bg-white py-3 px-4 text-sm text-black focus:border-black focus:outline-none';
const LABEL = 'block text-[11px] font-bold uppercase tracking-wider text-[#555555] mb-1.5';
const NOTE = 'rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]';

export default function SelectionStepOne({ parents, selection, onChange, onNext }: Props) {
  const categories = useMemo(() => eligibleCategories(parents), [parents]);
  const subcategories = useMemo(() => eligibleSubcategories(parents, selection.category), [parents, selection.category]);
  const sizes = useMemo(
    () => eligibleSizes(parents, selection.category, selection.subcategory),
    [parents, selection.category, selection.subcategory],
  );

  return (
    <div className="space-y-5">
      <div>
        <label className={LABEL} htmlFor="tee-category">Category</label>
        <select
          id="tee-category"
          className={FIELD}
          value={selection.category}
          onChange={(e) => onChange(selectCategory(selection, e.target.value))}
        >
          <option value="">Select a category</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {categories.length === 0 && <p className={`${NOTE} mt-2`}>No tees are available right now.</p>}
      </div>

      {selection.category && (
        <div>
          <label className={LABEL} htmlFor="tee-subcategory">Subcategory</label>
          <select
            id="tee-subcategory"
            className={FIELD}
            value={selection.subcategory}
            onChange={(e) => onChange(selectSubcategory(selection, e.target.value))}
          >
            <option value="">Select a subcategory</option>
            {subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {subcategories.length === 0 && (
            <p className={`${NOTE} mt-2`}>No subcategories with available stock in {selection.category} yet.</p>
          )}
        </div>
      )}

      {selection.subcategory && (
        <div>
          <span className={LABEL}>Size</span>
          {sizes.length === 0 ? (
            <p className={NOTE}>No matching tees have eligible stock in any size.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={selection.size === s}
                  onClick={() => onChange(selectSize(selection, s))}
                  className={`min-w-12 rounded-full border px-4 py-2 text-sm font-semibold ${
                    selection.size === s ? 'border-black bg-black text-white' : 'border-[#CDCDCD] bg-white text-black hover:border-black'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isStepOneComplete(selection) && (
        <button
          type="button"
          onClick={onNext}
          className="w-full rounded-full bg-black px-6 py-3.5 text-sm font-bold text-white hover:bg-[#333333]"
        >
          Next
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `SelectionStepTwo.tsx`**

```tsx
'use client';

import { useMemo } from 'react';
import type { ParentProduct, Product } from '@/shared/domain/types';
import { type Selection, eligibleParents, selectParent, isComplete } from '../domain/selection';
import { buildParentCard } from '../domain/cards';
import ParentCard from './ParentCard';

type Props = {
  parents: ParentProduct[];
  products: Product[];
  selection: Selection;
  onChange: (s: Selection) => void;
  onBack: () => void;
  onContinue: () => void;
  busy: boolean;
};

export default function SelectionStepTwo({ parents, products, selection, onChange, onBack, onContinue, busy }: Props) {
  const cards = useMemo(
    () =>
      eligibleParents(parents, selection.category, selection.subcategory, selection.size).map((p) =>
        buildParentCard(p, products, selection.size),
      ),
    [parents, products, selection.category, selection.subcategory, selection.size],
  );

  return (
    <div className="space-y-5">
      <p className="text-xs text-[#717171]">
        {selection.category} / {selection.subcategory} · Size {selection.size}
      </p>

      <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
        {cards.length === 0 ? (
          <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">No tees match this selection.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cards.map((card) => (
              <ParentCard
                key={card.parent.id}
                card={card}
                size={selection.size}
                selected={card.parent.id === selection.parentId}
                onSelect={() => onChange(selectParent(selection, card.parent.id))}
              />
            ))}
          </div>
        )}
      </fieldset>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onBack}
          className="rounded-full border border-[#CDCDCD] px-6 py-3.5 text-sm font-bold text-black hover:border-black disabled:opacity-50"
        >
          Back
        </button>
        {isComplete(selection) && (
          <button
            type="button"
            disabled={busy}
            onClick={onContinue}
            className="flex-1 rounded-full bg-black px-6 py-3.5 text-sm font-bold text-white hover:bg-[#333333] disabled:opacity-50"
          >
            {busy ? 'Checking stock…' : 'Continue to Design Studio'}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `CustomTeeModal.tsx`**

```tsx
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
      <div className="space-y-4">
        <h2 className="text-center text-2xl font-bold text-black">Tee selected</h2>
        <ul className="space-y-1 text-sm text-black">
          <li>Tee: {card.parent.name} (SKU {card.code})</li>
          <li>Category: {card.parent.category} / {card.parent.subcategory}</li>
          <li>Size: {handedOff.size}</li>
        </ul>
        {/* Phase C: the Design Studio opens here with this parent and size. */}
        <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-xs text-[#717171]">
          The Design Studio is coming soon. Your selection is saved for this session.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setHandedOff(null)}
            className="rounded-full border border-[#CDCDCD] px-6 py-3.5 text-sm font-bold text-black hover:border-black"
          >
            Change tee
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-black px-6 py-3.5 text-sm font-bold text-white hover:bg-[#333333]"
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
        {notice && <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">{notice}</p>}
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
      {!handedOff && <h2 className="mb-5 text-center text-2xl font-bold text-black">Design your tee</h2>}
      {body}
    </Modal>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/customTee/presentation/SelectionStepOne.tsx src/features/customTee/presentation/SelectionStepTwo.tsx src/features/customTee/presentation/CustomTeeModal.tsx
git commit -m "feat(custom-tee): two-step selection popup content"
```

---

### Task 4: Provider, landing page, navbar, cleanup

**Files:**
- Create: `src/features/customTee/presentation/CustomTeeProvider.tsx`
- Create: `src/features/customTee/presentation/CustomTeeLanding.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/custom-tee/page.tsx`
- Modify: `src/features/catalog/presentation/Navbar.tsx`
- Delete: `src/features/customTee/presentation/SelectionWizard.tsx`, `src/features/customTee/presentation/CustomTeeFlow.tsx`

**Interfaces:**
- Consumes: Task 3 `CustomTeeModal({ onClose })`.
- Produces: `CustomTeeProvider({ children })`, `useCustomTee(): { isOpen: boolean; open: () => void; close: () => void }` (throws outside the provider), `CustomTeeLanding()`.

- [ ] **Step 1: Write `CustomTeeProvider.tsx`**

```tsx
'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import CustomTeeModal from './CustomTeeModal';

type CustomTeeContextValue = { isOpen: boolean; open: () => void; close: () => void };

const CustomTeeContext = createContext<CustomTeeContextValue | null>(null);

// Renders the picker popup only while open, so tee data loads on demand and state resets on close.
export function CustomTeeProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return (
    <CustomTeeContext.Provider value={value}>
      {children}
      {isOpen && <CustomTeeModal onClose={close} />}
    </CustomTeeContext.Provider>
  );
}

export function useCustomTee(): CustomTeeContextValue {
  const ctx = useContext(CustomTeeContext);
  if (!ctx) throw new Error('useCustomTee must be used within CustomTeeProvider');
  return ctx;
}
```

- [ ] **Step 2: Write `CustomTeeLanding.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { useCustomTee } from './CustomTeeProvider';

// Direct-link target for /custom-tee: opens the picker popup on mount.
export default function CustomTeeLanding() {
  const { open } = useCustomTee();
  useEffect(() => {
    open();
  }, [open]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold uppercase tracking-wider text-black">Design your own tee</h1>
      <p className="mt-3 text-sm text-[#717171]">Pick a category, size and tee, then make it yours.</p>
      <button
        type="button"
        onClick={open}
        className="mt-8 rounded-full bg-black px-8 py-3.5 text-sm font-bold text-white hover:bg-[#333333]"
      >
        Start designing
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Mount the provider in `src/app/layout.tsx`** — add `import { CustomTeeProvider } from '@/features/customTee/presentation/CustomTeeProvider';` and wrap `{children}` inside `ProductNavigationProvider`:

```tsx
<ProductNavigationProvider>
  <CustomTeeProvider>
    {children}
  </CustomTeeProvider>
</ProductNavigationProvider>
```

- [ ] **Step 4: Replace `src/app/custom-tee/page.tsx`**

```tsx
'use client';

import Navbar from '@/features/catalog/presentation/Navbar';
import CustomTeeLanding from '@/features/customTee/presentation/CustomTeeLanding';

export default function CustomTeeRoute() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <CustomTeeLanding />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Update `Navbar.tsx`** — import `useCustomTee`, open the popup for the custom tab, and highlight the tab while the popup is open:

```tsx
import { useCustomTee } from '@/features/customTee/presentation/CustomTeeProvider';
```
Inside the component, after `const router = useRouter();`:
```tsx
const { isOpen: customOpen, open: openCustomTee } = useCustomTee();
```
Change `currentTab` so `customOpen ? 'custom' : <existing expression>` is evaluated first, and change `setTab` so the `'custom'` branch calls `openCustomTee()` instead of `router.push('/custom-tee')`:
```tsx
const setTab = (tab: 'shop' | 'custom' | 'orders' | 'admin') => {
  if (tab === 'custom') return openCustomTee();
  router.push(tab === 'shop' ? '/' : tab === 'orders' ? '/orders' : '/admin');
};
```

- [ ] **Step 6: Delete the old full-page files**

```bash
git rm src/features/customTee/presentation/SelectionWizard.tsx src/features/customTee/presentation/CustomTeeFlow.tsx
```

- [ ] **Step 7: Typecheck and run all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/features/customTee/presentation/CustomTeeProvider.tsx src/features/customTee/presentation/CustomTeeLanding.tsx src/app/layout.tsx src/app/custom-tee/page.tsx src/features/catalog/presentation/Navbar.tsx
git commit -m "feat(custom-tee): open the picker as a popup from the nav; landing page for /custom-tee"
```

---

### Task 5: Browser verification

**Files:** none (verification only; fix defects in the files above).

- [ ] **Step 1:** With the dev server running, open `http://localhost:3000/` and click **Custom Tee** in the nav. Expected: the popup opens over the home page, stepper shows step 1 active, backdrop dims the page, page behind does not scroll.
- [ ] **Step 2:** Step 1: pick category → subcategory → size. Expected: each field appears in turn; **Next** shows only after all three.
- [ ] **Step 3:** Click **Next**. Expected: step 2 active, image cards listed, **Back** present, **Continue to Design Studio** only after a card is selected. Back returns to step 1 with choices kept.
- [ ] **Step 4:** Change the category in step 1 after reaching step 2 and returning. Expected: subcategory and size cleared, Next hidden.
- [ ] **Step 5:** Click Continue. Expected: summary with tee, category, size; `sessionStorage['custom-tee-selection']` holds `{parentProductId,size}`; **Close** closes the popup.
- [ ] **Step 6:** Close via X, via Escape, and via backdrop click. Expected: each closes; body scroll restored.
- [ ] **Step 7:** Open `http://localhost:3000/custom-tee`. Expected: landing page with the popup open; closing it leaves the landing page and **Start designing** reopens it.
- [ ] **Step 8:** Stock revalidation: stub the stock fetch to return 0 stock and click Continue. Expected: notice shown, user returned to step 1, later steps cleared.
- [ ] **Step 9:** Narrow viewport: popup becomes a bottom sheet, content scrolls, cards 2-up.
- [ ] **Step 10:** Final checks: `npx tsc --noEmit && npx vitest run`; commit any fixes.
