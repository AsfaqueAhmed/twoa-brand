import type { ParentProduct } from '@/shared/domain/types';
import { selectableParents } from './selection';

export const HANDOFF_KEY = 'custom-tee-selection';

export type Handoff = { parentProductId: string; size: string };

export function parseHandoff(raw: string | null): Handoff | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v.parentProductId !== 'string' || !v.parentProductId || typeof v.size !== 'string' || !v.size) return null;
    return { parentProductId: v.parentProductId, size: v.size };
  } catch {
    return null;
  }
}

export function handoffFromParams(tee: string | null, size: string | null): Handoff | null {
  return tee && size ? { parentProductId: tee, size } : null;
}

// The imaged parent named by the hand-off that still has stock in that size.
export function resolveStudioTarget(parents: ParentProduct[], handoff: Handoff | null): ParentProduct | null {
  if (!handoff) return null;
  return (
    selectableParents(parents).find((p) => p.id === handoff.parentProductId && (p.stockBySize[handoff.size] ?? 0) > 0) ?? null
  );
}
