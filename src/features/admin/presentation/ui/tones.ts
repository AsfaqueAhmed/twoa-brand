export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'gray';

export const TONE_STYLES: Record<Tone, { pill: string; dot: string }> = {
  green: { pill: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  amber: { pill: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  red: { pill: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  blue: { pill: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  gray: { pill: 'bg-[#F0F0F0] text-[#555555]', dot: 'bg-[#A1A1A1]' },
};
