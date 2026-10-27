import { supabase } from '@/shared/infrastructure/supabase/client';
import type { OrderReturn, ReturnStatus } from '../domain/orderReturn';

function toReturn(row: Record<string, any>): OrderReturn {
  return { id: row.id, orderId: row.order_id, reason: row.reason, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function listReturns(): Promise<OrderReturn[]> {
  const { data, error } = await supabase.from('order_returns').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(toReturn);
}

export async function createReturn(orderId: string, reason: string): Promise<void> {
  const { error } = await supabase.from('order_returns').insert({ order_id: orderId, reason });
  if (error) throw new Error(error.message);
}

export async function updateReturnStatus(id: string, status: ReturnStatus): Promise<void> {
  const { error } = await supabase.from('order_returns').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}
