interface Props {
  value: number;          // 0–1
  size?: number;          // px
  stroke?: number;        // px
  label?: string;         // shown under the number
}

function bandColor(v: number): string {
  if (v < 0.35) return "#16A34A";
  if (v < 0.60) return "#F59E0B";
  if (v < 0.85) return "#EA580C";
  return "#B91C1C";
}

export default function RiskGauge({
  value,
  size = 200,
  stroke = 18,
  label = "National average risk",
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const dash = clamped * c;
  const color = bandColor(clamped);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#F1F0EC"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            style={{ transition: "stroke-dasharray 600ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div
              className="font-mono text-4xl font-semibold tracking-tight sm:text-5xl"
              style={{ color }}
            >
              {(clamped * 100).toFixed(0)}%
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-[#78716C]">
              at risk
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 text-center text-xs text-[#78716C]">{label}</div>
    </div>
  );
}