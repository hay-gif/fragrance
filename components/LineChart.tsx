"use client";

type DataPoint = {
  label: string; // x-axis label (date string)
  value: number;
};

type Props = {
  data: DataPoint[];
  /** Optional formatter for tooltip/axis values */
  formatValue?: (v: number) => string;
  height?: number;
  color?: string;
  fillColor?: string;
  className?: string;
};

export default function LineChart({
  data,
  formatValue = (v) => String(v),
  height = 120,
  color = "#C9A96E",
  fillColor = "rgba(201,169,110,0.08)",
  className = "",
}: Props) {
  if (data.length < 2) {
    return (
      <div className={`flex items-center justify-center text-xs text-[#C5C0B8] ${className}`} style={{ height }}>
        Nicht genug Daten
      </div>
    );
  }

  const W = 600;
  const H = height;
  const PAD = { top: 12, right: 16, bottom: 28, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const values = data.map((d) => d.value);
  const maxV = Math.max(...values, 1);
  const minV = 0;
  const range = maxV - minV || 1;

  const xStep = chartW / (data.length - 1);
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + chartH - ((v - minV) / range) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(" ");
  const areaPoints = [
    `${toX(0)},${PAD.top + chartH}`,
    ...data.map((d, i) => `${toX(i)},${toY(d.value)}`),
    `${toX(data.length - 1)},${PAD.top + chartH}`,
  ].join(" ");

  // Y-axis ticks (3 levels)
  const yTicks = [0, 0.5, 1].map((f) => ({
    y: toY(minV + f * range),
    label: formatValue(Math.round(minV + f * range)),
  }));

  // X-axis: show first, middle, last labels
  const xLabelIdxs = [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      className={className}
      style={{ overflow: "visible" }}
    >
      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <line key={i} x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y}
          stroke="#F0EDE8" strokeWidth="1" />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((t, i) => (
        <text key={i} x={PAD.left - 6} y={t.y + 4} textAnchor="end"
          fontSize="10" fill="#C5C0B8">{t.label}</text>
      ))}

      {/* X-axis labels */}
      {xLabelIdxs.map((idx) => (
        <text key={idx} x={toX(idx)} y={H - 4} textAnchor="middle"
          fontSize="10" fill="#C5C0B8">{data[idx].label}</text>
      ))}

      {/* Area fill */}
      <polygon points={areaPoints} fill={fillColor} />

      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />

      {/* End dot */}
      <circle cx={toX(data.length - 1)} cy={toY(data[data.length - 1].value)}
        r="3.5" fill={color} />
    </svg>
  );
}
