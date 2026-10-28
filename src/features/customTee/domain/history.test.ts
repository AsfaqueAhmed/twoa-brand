import { describe, it, expect } from 'vitest';
import { createHistory, live, settle, commit, undo, redo, canUndo, canRedo, HISTORY_LIMIT } from './history';

describe('history', () => {
  it('commit pushes the previous present to past and clears future', () => {
    let h = createHistory(1);
    h = commit(h, 2);
    h = commit(h, 3);
    expect(h.present).toBe(3);
    expect(h.past).toEqual([1, 2]);
    expect(h.future).toEqual([]);
  });

  it('undo and redo walk the stack', () => {
    let h = commit(commit(createHistory(1), 2), 3);
    h = undo(h);
    expect(h.present).toBe(2);
    expect(h.future).toEqual([3]);
    h = undo(h);
    expect(h.present).toBe(1);
    h = redo(h);
    expect(h.present).toBe(2);
    h = redo(h);
    expect(h.present).toBe(3);
    expect(redo(h)).toEqual(h);
  });

  it('a new commit after undo clears the redo stack', () => {
    let h = undo(commit(createHistory(1), 2));
    h = commit(h, 5);
    expect(h.future).toEqual([]);
    expect(h.past).toEqual([1]);
  });

  it('live updates replace present without adding history until settled', () => {
    let h = createHistory(1);
    h = live(h, 2);
    h = live(h, 3);
    expect(h.present).toBe(3);
    expect(h.past).toEqual([]);
    h = settle(h);
    expect(h.past).toEqual([1]);
    expect(h.pending).toBeNull();
  });

  it('a settled gesture is a single undo step', () => {
    let h = settle(live(live(createHistory(1), 2), 3));
    h = undo(h);
    expect(h.present).toBe(1);
  });

  it('settling a gesture that changed nothing adds no history', () => {
    const h = settle(live(createHistory(1), 1));
    expect(h.past).toEqual([]);
  });

  it('undo settles a pending gesture first', () => {
    const h = undo(live(createHistory(1), 2));
    expect(h.present).toBe(1);
    expect(h.future).toEqual([2]);
  });

  it('reports canUndo / canRedo', () => {
    let h = createHistory(1);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
    h = live(h, 2);
    expect(canUndo(h)).toBe(true);
    h = undo(h);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(true);
  });

  it('caps past at HISTORY_LIMIT, dropping the oldest', () => {
    let h = createHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 10; i++) h = commit(h, i);
    expect(h.past.length).toBe(HISTORY_LIMIT);
    expect(h.past[0]).toBe(10);
  });

  it('commit of the identical present is a no-op', () => {
    const h = createHistory({ a: 1 });
    expect(commit(h, h.present)).toBe(h);
  });
});
