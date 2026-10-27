'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { OrderNote } from '../domain/orderNote';
import { formatPlacedOn } from '../domain/orderView';
import { addOrderNote, deleteOrderNote, listOrderNotes } from '../infrastructure/orderNotesRepository';

export default function OrderNotesPanel({ orderId }: { orderId: string }) {
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const busy = saving || deleting;
  const [actionError, setActionError] = useState('');

  const requestId = useRef(0);

  const load = useCallback(async (quiet = false) => {
    const id = ++requestId.current;
    if (!quiet) {
      setLoading(true);
      setLoadError(false);
    }
    try {
      const result = await listOrderNotes(orderId);
      if (id !== requestId.current) return;
      setNotes(result);
      setLoadError(false);
    } catch (err) {
      if (id !== requestId.current) return;
      console.error('Error loading order notes: ', err);
      if (!quiet) setLoadError(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
    return () => {
      requestId.current++;
    };
  }, [load]);

  const save = async () => {
    if (busy || !draft.trim()) return;
    setSaving(true);
    setActionError('');
    try {
      await addOrderNote(orderId, draft);
      setDraft('');
      await load(true);
    } catch (err) {
      console.error('Error saving order note: ', err);
      setActionError("Couldn't save note.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (busy || !window.confirm('Delete this note?')) return;
    setActionError('');
    setDeleting(true);
    try {
      await deleteOrderNote(id);
      await load(true);
    } catch (err) {
      console.error('Error deleting order note: ', err);
      setActionError("Couldn't delete note.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 border-t border-[#F5F5F5] pt-3 text-xs">
      {loading ? (
        <p className="text-[#717171]">Loading notes...</p>
      ) : loadError ? (
        <p className="text-[#717171]">
          Couldn&apos;t load notes.{' '}
          <button type="button" onClick={() => load()} className="font-semibold text-black underline">Retry</button>
        </p>
      ) : notes.length === 0 ? (
        <p className="text-[#717171]">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-2 rounded-md bg-[#FAF9F6] p-2.5">
              <div className="min-w-0">
                <p className="whitespace-pre-wrap break-words text-black">{n.note}</p>
                <p className="mt-1 text-[10px] text-[#919191]">{formatPlacedOn(n.createdAt)}</p>
              </div>
              <button type="button" aria-label="Delete note" onClick={() => remove(n.id)} disabled={busy} className="rounded p-1 text-[#717171] hover:text-red-600 disabled:opacity-40">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <textarea
        aria-label="New note"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        placeholder="Write an internal note..."
        className="w-full rounded-lg border border-[#EEEEEE] p-2.5 text-xs text-black focus:border-black focus:outline-none"
      />
      {actionError && <p className="text-red-600">{actionError}</p>}
      <button
        type="button"
        onClick={save}
        disabled={busy || !draft.trim()}
        className="rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-[#222222] disabled:opacity-40"
      >
        {saving ? 'Saving...' : 'Save note'}
      </button>
    </div>
  );
}
