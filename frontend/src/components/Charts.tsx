"use client";

/** Gráfico de barras vertical simple (SVG, responsive). */
export function BarChart({
  data,
  color = "#7c3aed",
  height = 160,
  format = (v: number) => String(v),
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  format?: (v: number) => string;
}) {
  if (data.length === 0)
    return <p className="py-8 text-center text-sm text-slate-500">Sin datos.</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100">
            {format(d.value)}
          </span>
          <div
            className="w-full rounded-t transition-all"
            style={{
              height: `${Math.max((d.value / max) * (height - 24), d.value > 0 ? 3 : 0)}px`,
              backgroundColor: color,
            }}
            title={`${d.label}: ${format(d.value)}`}
          />
          <span className="truncate text-[9px] text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Gráfico de dona simple por categorías. */
export function DonutChart({
  data,
  size = 140,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = size / 2 - 12;
  const circ = 2 * Math.PI * radius;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {data.map((d, i) => {
          const len = (d.value / total) * circ;
          const offset = data
            .slice(0, i)
            .reduce((sum, item) => sum + (item.value / total) * circ, 0);
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={16}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
            />
          );
        })}
      </svg>
      <ul className="space-y-1 text-sm">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-slate-700">{d.label}</span>
            <b className="text-slate-900">{d.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
