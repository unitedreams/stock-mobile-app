type SparklineProps = {
  values: number[];
  positive: boolean;
};

export function Sparkline({ values, positive }: SparklineProps) {
  if (values.length < 2) {
    return <div className="h-10 w-24 rounded-md bg-zinc-200" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 96;
  const h = 40;
  const pad = 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const path = `M ${points.join(" L ")}`;
  const last = points[points.length - 1];
  const first = points[0];
  const area = `${path} L ${last.split(",")[0]},${h} L ${first.split(",")[0]},${h} Z`;
  const stroke = positive ? "#10b981" : "#f43f5e";
  const uid = positive ? "up" : "down";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-10 w-24 overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id={`spark-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${uid})`} />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
