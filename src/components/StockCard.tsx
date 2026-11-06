"use client";

import { useId, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { StockQuote } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { ScoreGauge } from "./ScoreGauge";
import { StockDetails } from "./StockDetails";

type StockCardProps = {
  quote: StockQuote;
  onRemove: (symbol: string) => void;
};

function ReturnPill({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  const isPositive = (value ?? 0) >= 0;
  return (
    <div className="flex flex-col items-center rounded-xl border border-zinc-200 bg-zinc-50 py-1.5 px-1">
      <span className="text-[10px] font-medium text-zinc-500">{label}</span>
      <span
        className={`mt-0.5 font-mono text-[11px] font-semibold ${
          value == null
            ? "text-zinc-400"
            : isPositive
            ? "text-emerald-600"
            : "text-rose-600"
        }`}
      >
        {value == null
          ? "—"
          : `${isPositive ? "+" : ""}${
              Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1)
            }%`}
      </span>
    </div>
  );
}

export function StockCard({ quote, onRemove }: StockCardProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const up = (quote.changePercent ?? 0) >= 0;
  const change = quote.changePercent;
  const hasFundamentals = quote.fundamentalDrivers.length > 0;

  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              {quote.symbol}
            </h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                up
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {change == null
                ? "—"
                : `${up ? "+" : ""}${change.toFixed(2)}%`}
            </span>
          </div>
          <p className="truncate text-xs text-zinc-500">{quote.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={panelId}
            className="rounded-full border border-zinc-200 bg-white p-1.5 text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900"
            aria-label={`${open ? "Hide" : "Show"} details for ${quote.symbol}`}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={() => onRemove(quote.symbol)}
            className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label={`Remove ${quote.symbol}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <p className="font-mono text-2xl font-medium tracking-tight text-zinc-900">
          {formatPrice(quote.price, quote.currency)}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5">
        <ReturnPill label="1M" value={quote.returns?.m1} />
        <ReturnPill label="3M" value={quote.returns?.m3} />
        <ReturnPill label="1Y" value={quote.returns?.y1} />
        <ReturnPill label="5Y" value={quote.returns?.y5} />
        <ReturnPill label="10Y" value={quote.returns?.y10} />
      </div>

      <div className="mt-4 flex gap-4">
        <ScoreGauge
          label="Technical"
          score={quote.technicalScore}
          badge={quote.technicalBadge}
        />
        <ScoreGauge
          label="Fundamental"
          score={quote.fundamentalScore}
          badge={quote.fundamentalBadge}
          unavailable={!hasFundamentals}
        />
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
        aria-hidden={!open}
      >
        <div id={panelId} className="overflow-hidden" inert={!open}>
          <StockDetails quote={quote} />
        </div>
      </div>
    </article>
  );
}
