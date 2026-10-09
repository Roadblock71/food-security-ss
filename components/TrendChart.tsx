interface Point {
  period: string;
  pct: number;
}

interface Props {
  points: Point[];
  height?: number;
  color?: string;
  label?: string;
}

export default function TrendChart({
  points,
  height = 160,
  color = "#1E3A8A",
  label = "Phase 3+ share",
}: Props) {
  if (!points.length) return null;

  const values = points.map((p) => p.pct);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const W = 800;
  const H = height;
  const padL = 40;
  const padR = 12;
  const padT = 14;
  const padB = 28;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const coords = points.map((p, i) => {
    const x = padL + (i / Math.max(1, points.length - 1)) * innerW;
    const y = padT + (1 - (p.pct - min) / range) * innerH;
    return { x, y, p };
  });

  const lineD = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  const areaD = `${lineD} L${coords[coords.length - 1].x.toFixed(1)},${H - padB} L${padL},${H - padB} Z`;

  // Y-axis ticks — 3 evenly-spaced gridlines
  const ticks = [min, min + range / 2, max];

  // X-axis labels — first, middle, last period
  const xLabels = [
    points[0].period,
    points[Math.floor(points.length / 2)].period,
    points[points.length - 1].period,
  ];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="auto"
      className="block"
      role="img"
      aria-label={label}
    >
      {/* Gridlines + y labels */}
      {ticks.map((t, i) => {
        const y = padT + (1 - (t - min) / range) * innerH;
        return (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y}
              y2={y}
              stroke="#F1F0EC"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="#A8A29E"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              {t.toFixed(0)}%
            </text>
          </g>
        );
      })}

      {/* Area + line */}
      <path d={areaD} fill={color} opacity={0.08} />
      <path
        d={lineD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Last point dot */}
      <circle
        cx={coords[coords.length - 1].x}
        cy={coords[coords.length - 1].y}
        r={3.5}
        fill="#fff"
        stroke={color}
        strokeWidth={2}
      />

      {/* X labels */}
      <text x={padL} y={H - 8} fontSize="10" fill="#A8A29E">
        {xLabels[0]}
      </text>
      <text x={W / 2} y={H - 8} fontSize="10" fill="#A8A29E" textAnchor="middle">
        {xLabels[1]}
      </text>
      <text x={W - padR} y={H - 8} fontSize="10" fill="#A8A29E" textAnchor="end">
        {xLabels[2]}
      </text>
    </svg>
  );
}