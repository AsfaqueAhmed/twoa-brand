import type { Tone } from '@/features/admin/presentation/ui/tones';
import type { QuoteStatus } from '../domain/customQuote';

export const QUOTE_TONE: Record<QuoteStatus, Tone> = {
  new: 'amber',
  contacted: 'blue',
  quoted: 'gray',
  ordered: 'green',
  declined: 'red',
  expired: 'gray',
};

export const FIELD = 'w-full rounded-lg border border-[#EEEEEE] bg-white px-3 py-2 text-sm focus:border-black focus:outline-none disabled:opacity-60';
export const BTN = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#EEEEEE] bg-white px-3.5 py-2 text-xs font-semibold text-black transition-colors hover:border-black disabled:opacity-50';
export const BTN_PRIMARY = 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#333333] disabled:opacity-50';

export function formatMoney(n: number): string {
  return `৳${n.toLocaleString('en-US')}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
