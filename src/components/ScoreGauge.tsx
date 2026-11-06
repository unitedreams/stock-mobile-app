import type { Badge } from "@/lib/types";

type ScoreGaugeProps = {
  label: string;
  score: number;
  badge: Badge;
  unavailable?: boolean;
};

const badgeStyles: Record<Badge, string> = {
  Buy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Hold: "bg-amber-50 text-amber-700 ring-amber-200",
  Avoid: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function ScoreGauge({ label, score, badge, unavailable = false }: ScoreGaugeProps) {
  const clamped = unavailable ? 0 : Math.max(-5, Math.min(5, score));
  const pct = ((clamped + 5) / 10) * 100;
  const fill =
    clamped >= 1.5
      ? "bg-emerald-500"
      : clamped <= -1.5
        ? "bg-rose-500"
        : "bg-amber-400";

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
            unavailable
              ? "bg-zinc-100 text-zinc-500 ring-zinc-200"
              : badgeStyles[badge]
          }`}
        >
          {unavailable ? "N/A" : badge}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="absolute inset-y-0 left-1/2 w-px bg-zinc-400"
          aria-hidden
        />
        <div
          className={`absolute inset-y-0 rounded-full ${fill}`}
          style={{
            left: clamped >= 0 ? "50%" : `${pct}%`,
            width: `${Math.abs(clamped) / 10 * 100}%`,
          }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
        <span>-5</span>
        <span className="font-mono text-zinc-700">
          {unavailable ? "—" : `${clamped > 0 ? "+" : ""}${clamped.toFixed(1)}`}
        </span>
        <span>+5</span>
      </div>
    </div>
  );
}
