import type { OrderStatus } from '@/shared/domain/types';

export const STATUS_DOT: Record<OrderStatus, string> = {
  pending: 'bg-orange-400',
  confirmed: 'bg-blue-500',
  out_for_delivery: 'bg-indigo-500',
  delivered: 'bg-emerald-500',
  cancelled: 'bg-red-500',
};
