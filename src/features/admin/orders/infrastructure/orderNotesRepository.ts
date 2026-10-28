import { supabase } from '@/shared/infrastructure/supabase/client';
import { normalizeNote, type OrderNote } from '../domain/orderNote';

function toNote(row: Record<string, any>): OrderNote {
  return { id: row.id, orderId: row.order_id, note: row.note, createdAt: row.created_at };
}

export async function listOrderNotes(orderId: string): Promise<OrderNote[]> {
  const { data, error } = await supabase.from('order_notes').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(toNote);
}

export async function addOrderNote(orderId: string, note: string): Promise<void> {
  const trimmed = normalizeNote(note);
  const { error } = await supabase.from('order_notes').insert({ order_id: orderId, note: trimmed });
  if (error) throw new Error(error.message);
}

export async function deleteOrderNote(id: string): Promise<void> {
  const { error } = await supabase.from('order_notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
