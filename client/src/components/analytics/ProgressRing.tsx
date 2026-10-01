import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

function colorFor(value: number): string {
  return value >= 90 ? '#10B981' : value >= 75 ? '#F59E0B' : '#EF4444';
}

interface ProgressRingProps {
  value: number;
  size?: number;
  label?: string;
  caption?: string;
  target?: number | null;
}

export default function ProgressRing({ value, size = 96, label, caption, target }: ProgressRingProps) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const color = colorFor(v);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <RadialBarChart
          width={size}
          height={size}
          cx="50%"
          cy="50%"
          innerRadius="72%"
          outerRadius="100%"
          barSize={size >= 120 ? 10 : 8}
          data={[{ name: 'value', value: v, fill: color }]}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: '#F3F4F6' }} dataKey="value" cornerRadius={10} />
        </RadialBarChart>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className={`${size < 100 ? 'text-sm' : 'text-base'} font-black text-text`}>{Number.isInteger(v) ? v : v.toFixed(1)}%</span>
          {target != null && <span className="text-[10px] font-semibold text-text-secondary">tgt {Math.round(target)}%</span>}
        </div>
      </div>
      {label && <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{label}</span>}
      {caption && <span className="text-[11px] text-text-secondary -mt-1">{caption}</span>}
    </div>
  );
}
