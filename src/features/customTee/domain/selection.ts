import type { ParentProduct } from '@/shared/domain/types';

export type Selection = { category: string; subcategory: string; size: string; parentId: string };
export type SelectionStep = 'category' | 'subcategory' | 'size' | 'parent';

export const EMPTY_SELECTION: Selection = { category: '', subcategory: '', size: '', parentId: '' };

const hasStock = (p: ParentProduct, size: string) => (p.stockBySize[size] ?? 0) > 0;
const hasAnyStock = (p: ParentProduct) => p.sizeOrder.some((s) => hasStock(p, s));
const sortedUnique = (values: string[]) => Array.from(new Set(values)).sort();

export function eligibleCategories(parents: ParentProduct[]): string[] {
  return sortedUnique(parents.filter((p) => p.category.trim() && hasAnyStock(p)).map((p) => p.category));
}

export function eligibleSubcategories(parents: ParentProduct[], category: string): string[] {
  return sortedUnique(
    parents.filter((p) => p.category === category && (p.subcategory ?? '').trim() && hasAnyStock(p)).map((p) => p.subcategory as string),
  );
}

function matching(parents: ParentProduct[], category: string, subcategory: string): ParentProduct[] {
  return parents.filter((p) => p.category === category && (p.subcategory ?? '') === subcategory);
}

export function eligibleSizes(parents: ParentProduct[], category: string, subcategory: string): string[] {
  const matches = matching(parents, category, subcategory);
  // Canonical order: first-seen across all matching parents' sizeOrder (including sold-out sizes), then filtered by stock.
  const ordered: string[] = [];
  for (const p of matches) for (const s of p.sizeOrder) if (!ordered.includes(s)) ordered.push(s);
  return ordered.filter((s) => matches.some((p) => hasStock(p, s)));
}

export function eligibleParents(parents: ParentProduct[], category: string, subcategory: string, size: string): ParentProduct[] {
  return matching(parents, category, subcategory).filter((p) => hasStock(p, size));
}

export const selectCategory = (_sel: Selection, category: string): Selection => ({ ...EMPTY_SELECTION, category });
export const selectSubcategory = (sel: Selection, subcategory: string): Selection => ({
  category: sel.category,
  subcategory,
  size: '',
  parentId: '',
});
export const selectSize = (sel: Selection, size: string): Selection => ({ ...sel, size, parentId: '' });
export const selectParent = (sel: Selection, parentId: string): Selection => ({ ...sel, parentId });

export const isComplete = (sel: Selection): boolean => !!(sel.category && sel.subcategory && sel.size && sel.parentId);

export type SelectionValidation = { ok: true } | { ok: false; resetTo: SelectionStep; reason: string };

// Walks the selection in order and reports the first step that is no longer valid against `parents`.
export function validateSelection(parents: ParentProduct[], sel: Selection): SelectionValidation {
  if (!sel.category || !eligibleCategories(parents).includes(sel.category)) {
    return { ok: false, resetTo: 'category', reason: 'Please choose a category.' };
  }
  if (!sel.subcategory || !eligibleSubcategories(parents, sel.category).includes(sel.subcategory)) {
    return { ok: false, resetTo: 'subcategory', reason: 'Please choose a subcategory.' };
  }
  if (!sel.size || !eligibleSizes(parents, sel.category, sel.subcategory).includes(sel.size)) {
    return { ok: false, resetTo: 'size', reason: 'That size is no longer available. Please choose again.' };
  }
  if (!sel.parentId || !eligibleParents(parents, sel.category, sel.subcategory, sel.size).some((p) => p.id === sel.parentId)) {
    return { ok: false, resetTo: 'parent', reason: 'That tee is no longer available in this size. Please choose again.' };
  }
  return { ok: true };
}
