interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  showArea?: boolean;
  showReference?: boolean;
  className?: string;
}

export default function Sparkline({
  values,
  width = 80,
  height = 28,
  color = "#1E3A8A",
  strokeWidth = 1.5,
  showArea = true,
  showReference = false,
  className = "",
}: Props) {
  if (!values || values.length < 2) {
    return <span className={`inline-block ${className}`} style={{ width, height }} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padX = 1;
  const padY = 3;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = values.map((v, i) => {
    const x = padX + (i / Math.max(1, values.length - 1)) * innerW;
    const y = padY + (1 - (v - min) / range) * innerH;
    return [x, y] as const;
  });

  const lineD = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const areaD = showArea
    ? `${lineD} L${points[points.length - 1][0].toFixed(1)},${height - padY} L${padX},${height - padY} Z`
    : null;

  const meanY = padY + (1 - (values.reduce((a, b) => a + b, 0) / values.length - min) / range) * innerH;

  const lastPoint = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible ${className}`}
      aria-hidden="true"
    >
      {areaD && <path d={areaD} fill={color} opacity={0.12} />}

      {showReference && (
        <line
          x1={padX}
          x2={width - padX}
          y1={meanY}
          y2={meanY}
          stroke={color}
          strokeWidth={0.5}
          strokeDasharray="2 2"
          opacity={0.4}
        />
      )}

      <path
        d={lineD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx={lastPoint[0]} cy={lastPoint[1]} r={2} fill={color} />
    </svg>
  );
}