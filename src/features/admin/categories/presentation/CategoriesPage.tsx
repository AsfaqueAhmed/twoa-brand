'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Folder, FolderTree, Plus, Trash2 } from 'lucide-react';
import AdminPageHeader from '@/features/admin/presentation/AdminPageHeader';
import AdminCard from '@/features/admin/presentation/AdminCard';
import EmptyState from '@/shared/ui/EmptyState';
import Spinner from '@/shared/ui/Spinner';
import { isValidCategoryName } from '@/features/admin/inventory/domain/category';
import { fetchAllProductsForAdmin } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import {
  fetchCategories, persistNewCategory, persistNewSubcategory, type CategoryDoc,
} from '@/features/catalog/infrastructure/firestoreCategoriesRepository';
import { deleteCategory, deleteSubcategory } from '@/features/admin/categories/infrastructure/categoriesAdminRepository';
import { buildCategoryTree, type CategoryNode } from '@/features/admin/categories/domain/categoryTree';
import { validateNewCategory, validateNewSubcategory } from '@/features/admin/categories/domain/validateCategory';
import { fetchParentProducts } from '@/features/admin/parentProducts/infrastructure/firestoreParentProductsAdminRepository';
import type { Product, ParentProduct } from '@/shared/domain/types';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
const REMOVE_HINT = 'Remove its products and parent products first';

function CountPill({ n, parents }: { n: number; parents: number }) {
  return (
    <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-xs font-medium text-[#717171]">
      {n} {n === 1 ? 'product' : 'products'}
      {parents > 0 && `, ${parents} ${parents === 1 ? 'parent' : 'parents'}`}
    </span>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [products, setProducts] = useState<Pick<Product, 'category' | 'subcategory'>[]>([]);
  const [parents, setParents] = useState<Pick<ParentProduct, 'category' | 'subcategory'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSub, setNewSub] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, p, pp] = await Promise.all([fetchCategories(), fetchAllProductsForAdmin(), fetchParentProducts()]);
        if (cancelled) return;
        setCategories(c);
        setProducts(p);
        setParents(pp);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) setLoadError(errMsg(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tick]);

  const reload = useCallback(() => { setLoadError(null); setLoading(true); setTick((t) => t + 1); }, []);
  const tree = useMemo(() => buildCategoryTree(categories, products, parents), [categories, products, parents]);

  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });

  const run = async (fn: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      reload();
      return true;
    } catch (e) {
      setActionError(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategory.trim();
    if (!isValidCategoryName(name)) { setAddError('Enter a category name.'); return; }
    const invalid = validateNewCategory(name, tree);
    if (invalid) { setAddError(invalid); return; }
    setAddError(null);
    if (await run(() => persistNewCategory(name))) setNewCategory('');
  };

  const addSub = async (e: React.FormEvent, cat: CategoryNode) => {
    e.preventDefault();
    const name = newSub.trim();
    if (!isValidCategoryName(name)) { setActionError('Enter a subcategory name.'); return; }
    const invalid = validateNewSubcategory(name, cat);
    if (invalid) { setActionError(invalid); return; }
    if (await run(() => persistNewSubcategory(cat.name, name))) {
      setNewSub('');
      setAddingSubFor(null);
      setExpanded((prev) => new Set(prev).add(cat.name));
    }
  };

  const removeCategory = (cat: CategoryNode) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    void run(() => deleteCategory({ id: cat.id, name: cat.name }));
  };
  const removeSub = (cat: CategoryNode, sub: string) => {
    if (!window.confirm(`Delete subcategory "${sub}"?`)) return;
    void run(() => deleteSubcategory(cat.name, sub));
  };

  const trashClass = 'rounded p-1.5 text-[#717171] hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#717171]';

  return (
    <div>
      <AdminPageHeader title="Categories" subtitle="Organise your catalog into categories and subcategories." />
      {loading && categories.length === 0 && !loadError ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {loadError} <button type="button" onClick={reload} className="font-bold underline">Retry</button>
        </div>
      ) : (
        <div className="space-y-4">
          <AdminCard title="Add category">
            <form onSubmit={addCategory} className="flex max-w-md gap-2">
              <input value={newCategory} onChange={(e) => { setNewCategory(e.target.value); setAddError(null); }}
                placeholder="Category name" aria-label="New category name" disabled={busy}
                className="min-w-0 flex-1 rounded-md border border-[#EEEEEE] px-3 py-2 text-sm" />
              <button type="submit" disabled={busy}
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Add category</button>
            </form>
            {addError && <p role="alert" className="mt-2 text-sm text-red-600">{addError}</p>}
            {tree.length === 0 && actionError && <p role="alert" className="mt-2 text-sm text-red-600">{actionError}</p>}
          </AdminCard>

          {tree.length === 0 ? (
            <EmptyState icon={FolderTree} title="No categories yet" description="Add your first category above." />
          ) : (
            <AdminCard
              title="Category tree"
              action={
                <div className="flex gap-3 text-sm">
                  <button type="button" onClick={() => setExpanded(new Set(tree.map((c) => c.name)))} className="font-medium underline">Expand all</button>
                  <button type="button" onClick={() => setExpanded(new Set())} className="font-medium underline">Collapse all</button>
                </div>
              }
            >
              {actionError && <p role="alert" className="mb-3 text-sm text-red-600">{actionError}</p>}
              <ul className="divide-y divide-[#EEEEEE]">
                {tree.map((cat) => {
                  const open = expanded.has(cat.name);
                  const blocked = cat.productCount > 0 || cat.parentCount > 0 || !cat.persisted;
                  return (
                    <li key={cat.name} className="py-2">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => toggle(cat.name)} aria-expanded={open}
                          aria-label={`${open ? 'Collapse' : 'Expand'} ${cat.name}`} className="rounded p-1 hover:bg-[#F5F5F5]">
                          <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
                        </button>
                        <Folder className="h-4 w-4 text-[#717171]" />
                        <span className="text-sm font-medium">{cat.name}</span>
                        <CountPill n={cat.productCount} parents={cat.parentCount} />
                        <div className="ml-auto flex items-center gap-1">
                          <button type="button" disabled={busy}
                            onClick={() => { setAddingSubFor(addingSubFor === cat.name ? null : cat.name); setNewSub(''); setActionError(null); }}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium hover:bg-[#F5F5F5] disabled:opacity-50">
                            <Plus className="h-3 w-3" /> Subcategory
                          </button>
                          <button type="button" disabled={busy || blocked} onClick={() => removeCategory(cat)}
                            title={blocked ? REMOVE_HINT : 'Delete category'} aria-label={`Delete ${cat.name}`} className={trashClass}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {addingSubFor === cat.name && (
                        <form onSubmit={(e) => addSub(e, cat)} className="ml-9 mt-2 flex max-w-md gap-2">
                          <input autoFocus value={newSub} onChange={(e) => setNewSub(e.target.value)} disabled={busy}
                            placeholder="Subcategory name" aria-label={`New subcategory for ${cat.name}`}
                            className="min-w-0 flex-1 rounded-md border border-[#EEEEEE] px-3 py-1.5 text-sm" />
                          <button type="submit" disabled={busy}
                            className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Add</button>
                        </form>
                      )}
                      {open && (
                        <ul className="ml-6 mt-1 border-l border-[#EEEEEE] pl-4">
                          {cat.subcategories.length === 0 && (
                            <li className="py-1.5 text-xs text-[#717171]">No subcategories</li>
                          )}
                          {cat.subcategories.map((sub) => {
                            const subBlocked = sub.productCount > 0 || sub.parentCount > 0 || !sub.persisted;
                            return (
                              <li key={sub.name} className="flex items-center gap-2 py-1.5">
                                <span className="text-sm">{sub.name}</span>
                                <CountPill n={sub.productCount} parents={sub.parentCount} />
                                <button type="button" disabled={busy || subBlocked} onClick={() => removeSub(cat, sub.name)}
                                  title={subBlocked ? REMOVE_HINT : 'Delete subcategory'} aria-label={`Delete ${sub.name}`}
                                  className={`ml-auto ${trashClass}`}>
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </AdminCard>
          )}
        </div>
      )}
    </div>
  );
}
