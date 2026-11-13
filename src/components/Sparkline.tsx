"use client";

import { useId } from "react";

type SparklineProps = {
  values: number[];
  positive: boolean;
  height?: number;
  className?: string;
};

export function Sparkline({ values, positive, height = 40, className }: SparklineProps) {
  const gradientId = useId();

  if (values.length < 2) {
    return <div className={`h-10 rounded-md bg-zinc-100 ${className ?? "w-24"}`} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 96;
  const h = height;
  const pad = 2;

  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (value - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const path = `M ${points.join(" L ")}`;
  const first = points[0].split(",")[0];
  const last = points[points.length - 1].split(",")[0];
  const area = `${path} L ${last},${h} L ${first},${h} Z`;
  const stroke = positive ? "#10b981" : "#f43f5e";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className ?? "h-10 w-24"}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
