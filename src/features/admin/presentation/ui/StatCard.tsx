import { TONE_STYLES, type Tone } from './tones';

type Props = { icon: React.ReactNode; label: string; value: number | string; caption?: string; tone?: Tone };

export default function StatCard({ icon, label, value, caption, tone }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#EEEEEE] bg-white p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#EEEEEE] bg-[#FAF9F6] text-black">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-[#717171]">{label}</div>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-2xl font-bold text-black">
          {tone && <span className={`h-2.5 w-2.5 rounded-full ${TONE_STYLES[tone].dot}`} />}
          <span className="min-w-0 truncate" title={String(value)}>{value}</span>
        </div>
        {caption && <div className="mt-0.5 text-xs text-[#919191]">{caption}</div>}
      </div>
    </div>
  );
}
