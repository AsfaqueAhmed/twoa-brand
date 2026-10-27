export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'refunded';

export interface OrderReturn {
  id: string; orderId: string; reason: string; status: ReturnStatus; createdAt: string; updatedAt: string;
}

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: 'Requested', approved: 'Approved', rejected: 'Rejected', refunded: 'Refunded',
};

export function NEXT_RETURN_STATUSES(status: ReturnStatus): ReturnStatus[] {
  if (status === 'requested') return ['approved', 'rejected'];
  if (status === 'approved') return ['refunded'];
  return [];
}
