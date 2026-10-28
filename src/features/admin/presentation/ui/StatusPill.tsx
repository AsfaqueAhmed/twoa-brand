import { TONE_STYLES, type Tone } from './tones';

type Props = { tone: Tone; children: React.ReactNode; dot?: boolean };

export default function StatusPill({ tone, children, dot = true }: Props) {
  const s = TONE_STYLES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${s.pill}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />}
      {children}
    </span>
  );
}
