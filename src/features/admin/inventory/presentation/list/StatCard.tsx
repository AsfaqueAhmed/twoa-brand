export default function StatCard({ icon, label, value, note, dot }: { icon: React.ReactNode; label: string; value: number; note?: string; dot?: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#EEEEEE] bg-white p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#EEEEEE] bg-[#FAF9F6] text-black">
        {icon}
      </div>
      <div>
        <div className="text-xs text-[#717171]">{label}</div>
        <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-black">
          {dot && <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />}
          {value}
        </div>
        {note && <div className="mt-0.5 text-xs text-[#919191]">{note}</div>}
      </div>
    </div>
  );
}
