'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCustomTeeData } from '../../application/useCustomTeeData';
import { buildParentCard } from '../../domain/cards';
import { DESIGN_STORAGE_KEY, parseDesign } from '../../domain/design';
import {
  HANDOFF_KEY,
  type Handoff,
  handoffFromParams,
  parseHandoff,
  resolveStudioTarget,
} from '../../domain/studioTarget';
import MobileStudioEditor from './MobileStudioEditor';

const MESSAGE = 'px-4 py-24 text-center text-sm text-[#717171]';

export default function MobileStudioPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { parents, products, loading, error, refreshParents } = useCustomTeeData();
  const tee = params.get('tee');
  const sizeParam = params.get('size');

  // Query params win; otherwise the popup's sessionStorage hand-off.
  const handoff = useMemo<Handoff | null>(() => {
    const fromParams = handoffFromParams(tee, sizeParam);
    if (fromParams) return fromParams;
    return typeof window === 'undefined' ? null : parseHandoff(sessionStorage.getItem(HANDOFF_KEY));
  }, [tee, sizeParam]);

  const resolvedFor = useRef<string | null>(null);
  const [ready, setReady] = useState<Handoff | null>(null);
  const handoffKey = handoff ? `${handoff.parentProductId}:${handoff.size}` : '';

  useEffect(() => {
    if (loading || error) return;
    if (resolvedFor.current === handoffKey) return;
    resolvedFor.current = handoffKey;
    if (handoff && resolveStudioTarget(parents, handoff)) {
      setReady(handoff);
    } else {
      router.replace('/custom-tee');
    }
  }, [loading, error, handoff, handoffKey, parents, router]);

  const parent = ready ? parents.find((p) => p.id === ready.parentProductId) : undefined;
  const card = useMemo(
    () => (parent && ready ? buildParentCard(parent, products, ready.size) : null),
    [parent, products, ready],
  );

  if (loading) return <p className={MESSAGE}>Loading mobile studio…</p>;
  if (error) return <p role="alert" className={`${MESSAGE} text-red-600`}>{error}</p>;
  if (!ready) return <p className={MESSAGE}>Opening your tee…</p>;
  if (!parent || !card) {
    return (
      <div className={MESSAGE}>
        <p>This tee is no longer available.</p>
        <button
          type="button"
          onClick={() => router.replace('/custom-tee')}
          className="mt-4 rounded-xl bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-sm"
        >
          Choose another tee
        </button>
      </div>
    );
  }

  // Restore saved design if matching same tee
  const saved = parseDesign(
    typeof window !== 'undefined' ? sessionStorage.getItem(DESIGN_STORAGE_KEY) : null,
  );
  const restore = saved && saved.parentProductId === parent.id ? saved : null;
  const initialSize =
    restore && (parent.stockBySize[restore.size] ?? 0) > 0 ? restore.size : ready.size;

  return (
    <MobileStudioEditor
      key={`${parent.id}:${ready.size}`}
      parent={parent}
      card={card}
      initialSize={initialSize}
      initialColor={restore?.colorName}
      initialLayersByView={restore?.layersByView ?? {}}
      refreshParents={refreshParents}
    />
  );
}
