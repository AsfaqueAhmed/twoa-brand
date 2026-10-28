const STEPS = ['Category & size', 'Choose tee'];

export default function Stepper({ step }: { step: 1 | 2 }) {
  return (
    <ol aria-label="Progress" className="mb-6 flex items-center justify-center gap-2">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const reached = n <= step;
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                reached ? 'bg-black text-white' : 'bg-[#EEEEEE] text-[#717171]'
              }`}
            >
              {n}
            </span>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${active ? 'text-black' : 'text-[#717171]'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-[#DDDDDD]" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
