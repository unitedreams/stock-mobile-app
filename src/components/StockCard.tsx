"use client";

import { useId, useState } from "react";
import { Archive, ChevronDown, X } from "lucide-react";
import type { Position, StockQuote } from "@/lib/types";
import { formatPrice, formatSignedPercent } from "@/lib/format";
import { ScoreGauge } from "./ScoreGauge";
import { StockDetails } from "./StockDetails";

type StockCardProps = {
  quote: StockQuote;
  positions: Position[];
  onRemove: (symbol: string) => void;
  onArchive: (symbol: string) => void;
  onBuy: (quote: StockQuote, amount: number) => string | null;
  onSell: (symbol: string) => void;
};

function formatReturn(value: number): string {
  const wide = Math.abs(value) >= 100;
  const rounded = wide ? Math.round(value) : Math.round(value * 10) / 10;
  if (rounded === 0) return "0.0%";
  const digits = wide ? Math.abs(rounded).toFixed(0) : Math.abs(rounded).toFixed(1);
  return `${rounded > 0 ? "+" : "-"}${digits}%`;
}

function ReturnPill({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  const rounded = value == null ? null : Math.round(value * 10) / 10;
  const tone =
    rounded == null || rounded === 0
      ? "text-zinc-400"
      : rounded > 0
        ? "text-emerald-600"
        : "text-rose-600";

  return (
    <div className="flex flex-col items-center rounded-xl border border-zinc-200 bg-zinc-50 py-1.5 px-1">
      <span className="text-[10px] font-medium text-zinc-500">{label}</span>
      <span className={`mt-0.5 font-mono text-[11px] font-semibold ${tone}`}>
        {value == null ? "—" : formatReturn(value)}
      </span>
    </div>
  );
}

export function StockCard({
  quote,
  positions,
  onRemove,
  onArchive,
  onBuy,
  onSell,
}: StockCardProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const up = (quote.changePercent ?? 0) >= 0;
  const change = quote.changePercent;
  const hasFundamentals = quote.fundamentalDrivers.length > 0;

  const startDate = quote.historyStart ? new Date(quote.historyStart) : null;
  const startLabel =
    startDate && !Number.isNaN(startDate.getTime())
      ? startDate.toLocaleDateString("en-CA", { month: "short", year: "numeric" })
      : null;
  const missingLabel = startDate
    ? (
        [
          ["5Y", 5],
          ["10Y", 10],
        ] as const
      )
        .filter(([, years]) => {
          const boundary = new Date();
          boundary.setFullYear(boundary.getFullYear() - years);
          return startDate.getTime() > boundary.getTime() + 15 * 86_400_000;
        })
        .map(([label]) => label)
        .join(" and ")
    : "";

  const invested = positions.reduce((sum, position) => sum + position.invested, 0);
  const shares = positions.reduce((sum, position) => sum + position.shares, 0);
  const positionValue = quote.price != null ? shares * quote.price : invested;
  const positionProfit = positionValue - invested;
  const positionPercent = invested > 0 ? (positionProfit / invested) * 100 : 0;

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
            onClick={() => onArchive(quote.symbol)}
            className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label={`Archive ${quote.symbol}`}
          >
            <Archive className="h-4 w-4" />
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

      {missingLabel ? (
        <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-400">
          {missingLabel} not available — this listing starts {startLabel}
          {quote.sinceListing != null
            ? `, ${formatSignedPercent(quote.sinceListing)} since then`
            : null}
          .
        </p>
      ) : null}

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

      {positions.length > 0 ? (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-700/80">
            Your position
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-mono text-[12px] font-semibold text-zinc-900">
              {formatPrice(positionValue, quote.currency)}
            </span>
            <span
              className={`font-mono text-[11px] font-semibold ${
                positionProfit >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatSignedPercent(positionPercent)}
            </span>
          </span>
        </div>
      ) : null}

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
        aria-hidden={!open}
      >
        <div id={panelId} className="overflow-hidden" inert={!open}>
          <StockDetails
            quote={quote}
            positions={positions}
            onBuy={onBuy}
            onSell={onSell}
          />
        </div>
      </div>
    </article>
  );
}
