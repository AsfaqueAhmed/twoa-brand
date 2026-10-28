import type { Layer } from './layers';

const withoutGroup = (l: Layer): Layer => {
  const { groupId: _groupId, ...rest } = l;
  return rest as Layer;
};

// `ids` plus every member of the groups they belong to, in stack order.
export function expandToGroups(layers: Layer[], ids: string[]): string[] {
  const wanted = new Set(ids);
  const groups = new Set<string>();
  for (const l of layers) if (wanted.has(l.id) && l.groupId) groups.add(l.groupId);
  return layers.filter((l) => wanted.has(l.id) || (l.groupId !== undefined && groups.has(l.groupId))).map((l) => l.id);
}

export const toggleId = (selected: string[], id: string): string[] =>
  selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];

// A group needs at least two members; lone group ids are dropped.
export function normalizeGroups(layers: Layer[]): Layer[] {
  const counts = new Map<string, number>();
  for (const l of layers) if (l.groupId) counts.set(l.groupId, (counts.get(l.groupId) ?? 0) + 1);
  if (![...counts.values()].some((n) => n < 2)) return layers;
  return layers.map((l) => (l.groupId && (counts.get(l.groupId) ?? 0) < 2 ? withoutGroup(l) : l));
}

export function removeLayers(layers: Layer[], ids: string[]): Layer[] {
  const gone = new Set(ids);
  if (!layers.some((l) => gone.has(l.id))) return layers;
  return normalizeGroups(layers.filter((l) => !gone.has(l.id)));
}

// Makes the selection (expanded to whole groups) one group, contiguous at the position of the topmost member.
export function groupLayers(layers: Layer[], ids: string[], groupId: string): Layer[] {
  const members = new Set(expandToGroups(layers, ids));
  if (members.size < 2) return layers;
  let topIndex = -1;
  layers.forEach((l, i) => {
    if (members.has(l.id)) topIndex = i;
  });
  const insertAt = layers.slice(0, topIndex).filter((l) => !members.has(l.id)).length;
  const grouped = layers.filter((l) => members.has(l.id)).map((l) => ({ ...l, groupId }) as Layer);
  const rest = layers.filter((l) => !members.has(l.id));
  return normalizeGroups([...rest.slice(0, insertAt), ...grouped, ...rest.slice(insertAt)]);
}

export function ungroupLayers(layers: Layer[], ids: string[]): Layer[] {
  const members = new Set(expandToGroups(layers, ids));
  if (!layers.some((l) => members.has(l.id) && l.groupId)) return layers;
  return layers.map((l) => (members.has(l.id) && l.groupId ? withoutGroup(l) : l));
}

// A "unit" is a group (its members) or a lone layer; returned in stack order.
export function stackUnits(layers: Layer[]): string[][] {
  const units: string[][] = [];
  const byGroup = new Map<string, string[]>();
  for (const l of layers) {
    if (l.groupId) {
      const existing = byGroup.get(l.groupId);
      if (existing) {
        existing.push(l.id);
        continue;
      }
      const unit = [l.id];
      byGroup.set(l.groupId, unit);
      units.push(unit);
    } else {
      units.push([l.id]);
    }
  }
  return units;
}

export function selectionUnits(layers: Layer[], ids: string[]): string[][] {
  const selected = new Set(ids);
  return stackUnits(layers).filter((unit) => unit.some((id) => selected.has(id)));
}

// True when the selection is exactly one lone layer or one complete group.
export function isSingleUnit(layers: Layer[], ids: string[]): boolean {
  const units = selectionUnits(layers, ids);
  return units.length === 1 && units[0].every((id) => ids.includes(id));
}

const flatten = (units: string[][], layers: Layer[]): Layer[] => {
  const byId = new Map(layers.map((l) => [l.id, l]));
  return units.flat().map((id) => byId.get(id)!);
};

// 'up' moves toward the top of the stack (later in the array); moves a whole group as a block.
export function moveUnit(layers: Layer[], id: string, direction: 'up' | 'down'): Layer[] {
  const units = stackUnits(layers);
  const i = units.findIndex((u) => u.includes(id));
  const j = direction === 'up' ? i + 1 : i - 1;
  if (i < 0 || j < 0 || j >= units.length) return layers;
  const next = units.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return flatten(next, layers);
}

export function reorderUnit(layers: Layer[], id: string, toUnitIndex: number): Layer[] {
  const units = stackUnits(layers);
  const i = units.findIndex((u) => u.includes(id));
  if (i < 0) return layers;
  const next = units.slice();
  const [moved] = next.splice(i, 1);
  next.splice(Math.min(Math.max(toUnitIndex, 0), next.length), 0, moved);
  return flatten(next, layers);
}
