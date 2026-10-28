const STEPS = ['Category & size', 'Choose tee'];

export default function Stepper({ step }: { step: 1 | 2 }) {
  return (
    <ol aria-label="Progress" className="mb-8 flex items-center justify-center gap-3">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const reached = n <= step;
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                reached ? 'bg-black text-white' : 'bg-[#EEEEEE] text-[#717171]'
              }`}
            >
              {n}
            </span>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${active ? 'text-black' : 'text-[#717171]'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-8 bg-[#EEEEEE]" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
