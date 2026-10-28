export const HISTORY_LIMIT = 50;

export type History<T> = {
  past: T[];
  present: T;
  future: T[];
  /** Set while a gesture (e.g. a drag) is in progress: the value to push to `past` when it settles. */
  pending: { base: T } | null;
};

export const createHistory = <T,>(present: T): History<T> => ({ past: [], present, future: [], pending: null });

// Replaces the present without creating a history entry (used while dragging).
export function live<T>(h: History<T>, next: T): History<T> {
  return { ...h, present: next, pending: h.pending ?? { base: h.present } };
}

// Ends a gesture: the whole gesture becomes one undo step (nothing if it changed nothing).
export function settle<T>(h: History<T>): History<T> {
  if (!h.pending) return h;
  if (Object.is(h.pending.base, h.present)) return { ...h, pending: null };
  return { past: [...h.past, h.pending.base].slice(-HISTORY_LIMIT), present: h.present, future: [], pending: null };
}

// A discrete change: one undo step.
export const commit = <T,>(h: History<T>, next: T): History<T> =>
  Object.is(next, h.present) && !h.pending ? h : settle(live(h, next));

export function undo<T>(h: History<T>): History<T> {
  const s = settle(h);
  if (s.past.length === 0) return s;
  const previous = s.past[s.past.length - 1];
  return { past: s.past.slice(0, -1), present: previous, future: [s.present, ...s.future], pending: null };
}

export function redo<T>(h: History<T>): History<T> {
  const s = settle(h);
  if (s.future.length === 0) return s;
  const [next, ...rest] = s.future;
  return { past: [...s.past, s.present], present: next, future: rest, pending: null };
}

export const canUndo = <T,>(h: History<T>): boolean =>
  h.past.length > 0 || (h.pending !== null && !Object.is(h.pending.base, h.present));

export const canRedo = <T,>(h: History<T>): boolean => h.future.length > 0;
