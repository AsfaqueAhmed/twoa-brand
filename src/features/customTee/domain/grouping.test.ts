import { describe, it, expect } from 'vitest';
import { createImageLayer, type Layer } from './layers';
import {
  expandToGroups,
  toggleId,
  normalizeGroups,
  removeLayers,
  groupLayers,
  ungroupLayers,
  stackUnits,
  selectionUnits,
  isSingleUnit,
  moveUnit,
  reorderUnit,
} from './grouping';

const L = (id: string, groupId?: string): Layer => ({
  ...createImageLayer({ id, name: id, src: 'data:image/png;base64,AA', aspect: 1 }),
  ...(groupId ? { groupId } : {}),
});
const ids = (ls: Layer[]) => ls.map((l) => l.id);

describe('expandToGroups / toggleId', () => {
  const layers = [L('a'), L('b', 'g'), L('c'), L('d', 'g')];
  it('adds every member of a touched group, in stack order', () => {
    expect(expandToGroups(layers, ['b'])).toEqual(['b', 'd']);
    expect(expandToGroups(layers, ['c', 'd'])).toEqual(['b', 'c', 'd']);
    expect(expandToGroups(layers, ['a'])).toEqual(['a']);
  });
  it('toggles an id in a selection', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('normalizeGroups / removeLayers', () => {
  it('drops group ids that have fewer than two members', () => {
    const out = normalizeGroups([L('a', 'g'), L('b'), L('c', 'h'), L('d', 'h')]);
    expect(out[0].groupId).toBeUndefined();
    expect(out[2].groupId).toBe('h');
  });
  it('returns the same array when nothing needs fixing', () => {
    const layers = [L('a', 'g'), L('b', 'g')];
    expect(normalizeGroups(layers)).toBe(layers);
  });
  it('removing a member dissolves a two-member group', () => {
    const out = removeLayers([L('a', 'g'), L('b', 'g'), L('c')], ['a']);
    expect(ids(out)).toEqual(['b', 'c']);
    expect(out[0].groupId).toBeUndefined();
  });
  it('returns the same array when no id matches', () => {
    const layers = [L('a')];
    expect(removeLayers(layers, ['zzz'])).toBe(layers);
  });
});

describe('groupLayers / ungroupLayers', () => {
  it('groups the selection, contiguous at the topmost member', () => {
    const out = groupLayers([L('a'), L('b'), L('c'), L('d')], ['a', 'c'], 'g1');
    expect(ids(out)).toEqual(['b', 'a', 'c', 'd']);
    expect(out.filter((l) => l.groupId === 'g1').map((l) => l.id)).toEqual(['a', 'c']);
  });
  it('needs at least two layers', () => {
    const layers = [L('a'), L('b')];
    expect(groupLayers(layers, ['a'], 'g1')).toBe(layers);
  });
  it('merges existing groups touched by the selection', () => {
    const out = groupLayers([L('a', 'g'), L('b', 'g'), L('c')], ['b', 'c'], 'g2');
    expect(out.every((l) => l.groupId === 'g2')).toBe(true);
  });
  it('ungroups the groups touched by the selection', () => {
    const out = ungroupLayers([L('a', 'g'), L('b', 'g'), L('c', 'h'), L('d', 'h')], ['a']);
    expect(out[0].groupId).toBeUndefined();
    expect(out[1].groupId).toBeUndefined();
    expect(out[2].groupId).toBe('h');
  });
  it('ungroup is a no-op (same array) when nothing is grouped', () => {
    const layers = [L('a'), L('b')];
    expect(ungroupLayers(layers, ['a', 'b'])).toBe(layers);
  });
});

describe('units', () => {
  const layers = [L('a'), L('b', 'g'), L('c', 'g'), L('d')];
  it('partitions the stack into units', () => {
    expect(stackUnits(layers)).toEqual([['a'], ['b', 'c'], ['d']]);
  });
  it('lists the units a selection touches', () => {
    expect(selectionUnits(layers, ['c', 'd'])).toEqual([['b', 'c'], ['d']]);
  });
  it('isSingleUnit is true for one lone layer or one full group', () => {
    expect(isSingleUnit(layers, ['a'])).toBe(true);
    expect(isSingleUnit(layers, ['b', 'c'])).toBe(true);
    expect(isSingleUnit(layers, ['b'])).toBe(false); // part of a group
    expect(isSingleUnit(layers, ['a', 'd'])).toBe(false);
    expect(isSingleUnit(layers, [])).toBe(false);
  });
  it('moves a whole unit up/down, no-op at the edges', () => {
    expect(ids(moveUnit(layers, 'b', 'up'))).toEqual(['a', 'd', 'b', 'c']);
    expect(ids(moveUnit(layers, 'd', 'down'))).toEqual(['a', 'd', 'b', 'c']);
    expect(moveUnit(layers, 'd', 'up')).toBe(layers);
    expect(moveUnit(layers, 'a', 'down')).toBe(layers);
  });
  it('reorders a unit to a unit index', () => {
    expect(ids(reorderUnit(layers, 'a', 2))).toEqual(['b', 'c', 'd', 'a']);
    expect(ids(reorderUnit(layers, 'd', 0))).toEqual(['d', 'a', 'b', 'c']);
  });
});
