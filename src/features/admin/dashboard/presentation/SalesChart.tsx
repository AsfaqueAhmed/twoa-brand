'use client';

import { useState } from 'react';
import { formatCurrency } from '@/shared/lib/formatCurrency';

export default function SalesChart({ data }: { data: { date: string; total: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 220, PAD = { l: 48, r: 12, t: 12, b: 28 };
  const max = Math.max(1, ...data.map((d) => d.total));
  const x = (i: number) => PAD.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * (W - PAD.l - PAD.r));
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.total)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${H - PAD.b} L${x(0)},${H - PAD.b} Z`;
  const step = Math.max(1, Math.ceil(data.length / 7));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sales over time" onMouseLeave={() => setHover(null)}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)} stroke="#EEEEEE" />
          <text x={PAD.l - 6} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill="#717171">{Math.round(max * f)}</text>
        </g>
      ))}
      <path d={area} fill="#16a34a" opacity="0.12" />
      <path d={line} fill="none" stroke="#16a34a" strokeWidth="2" />
      {data.map((d, i) => (
        <g key={d.date}>
          <rect x={x(i) - 10} y={PAD.t} width="20" height={H - PAD.t - PAD.b} fill="transparent" onMouseEnter={() => setHover(i)} />
          {i % step === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#717171">{d.date.slice(5)}</text>}
        </g>
      ))}
      {hover !== null && (
        <g>
          <circle cx={x(hover)} cy={y(data[hover].total)} r="4" fill="#16a34a" />
          <text x={Math.min(Math.max(x(hover), 70), W - 70)} y={y(data[hover].total) - 10} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
            {data[hover].date.slice(5)}: {formatCurrency(data[hover].total)}
          </text>
        </g>
      )}
    </svg>
  );
}
