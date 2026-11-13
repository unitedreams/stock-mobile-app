"use client";

import { useEffect, useMemo, useState } from "react";
import type { HistoryPoint, Position, StockQuote } from "@/lib/types";
import { currencySymbol, formatPrice, formatSignedMoney, formatSignedPercent } from "@/lib/format";
import { Sparkline } from "./Sparkline";

type PositionSectionProps = {
  quote: StockQuote;
  positions: Position[];
  onBuy: (quote: StockQuote, amount: number) => string | null;
  onSell: (symbol: string) => void;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PositionSection({ quote, positions, onBuy, onSell }: PositionSectionProps) {
  const [amount, setAmount] = useState("1000");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startDate = useMemo(() => {
    if (positions.length === 0) return null;
    return positions.reduce(
      (earliest, position) => (position.boughtAt < earliest ? position.boughtAt : earliest),
      positions[0].boughtAt,
    );
  }, [positions]);

  useEffect(() => {
    if (!startDate) return;
    const controller = new AbortController();
    fetch(
      `/api/history?symbol=${encodeURIComponent(quote.symbol)}&from=${startDate}`,
      { signal: controller.signal },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { points?: HistoryPoint[] } | null) => {
        if (Array.isArray(data?.points)) setHistory(data.points);
      })
      .catch(() => {
        // keep the chart empty if history is unavailable
      });
    return () => controller.abort();
  }, [quote.symbol, startDate]);

  const totals = useMemo(() => {
    const invested = positions.reduce((sum, position) => sum + position.invested, 0);
    const shares = positions.reduce((sum, position) => sum + position.shares, 0);
    return { invested, shares, averagePrice: shares > 0 ? invested / shares : 0 };
  }, [positions]);

  const hasPosition = positions.length > 0;
  const price = quote.price;
  const currentValue = price != null ? totals.shares * price : totals.invested;
  const profit = currentValue - totals.invested;
  const profitPercent = totals.invested > 0 ? (profit / totals.invested) * 100 : 0;

  const previousClose = useMemo(() => {
    if (history.length === 0) return null;
    const now = today();
    for (let index = history.length - 1; index >= 0; index -= 1) {
      if (history[index].date < now) return history[index].close;
    }
    return null;
  }, [history]);

  const dayChange = useMemo(() => {
    if (!hasPosition) return null;
    if (previousClose != null && price != null) {
      return (price - previousClose) * totals.shares;
    }
    if (quote.changePercent != null && price != null && quote.changePercent !== -100) {
      const previousPrice = price / (1 + quote.changePercent / 100);
      return (price - previousPrice) * totals.shares;
    }
    return null;
  }, [hasPosition, previousClose, price, quote.changePercent, totals.shares]);

  const series = useMemo(() => {
    if (history.length === 0 || !hasPosition) return [];
    const values = history.map((point) => {
      const activeShares = positions
        .filter((position) => position.boughtAt <= point.date)
        .reduce((sum, position) => sum + position.shares, 0);
      return activeShares * point.close;
    });
    if (price != null) values.push(totals.shares * price);
    return values;
  }, [history, hasPosition, positions, price, totals.shares]);

  function submit() {
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }
    const message = onBuy(quote, parsed);
    setError(message);
  }

  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Paper trade
        </h3>
        {hasPosition ? (
          <button
            type="button"
            onClick={() => onSell(quote.symbol)}
            className="text-[10px] font-medium text-rose-600 hover:text-rose-700"
          >
            Sell all
          </button>
        ) : null}
      </div>

      {hasPosition ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3 py-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-700/70">
                Worth today
              </p>
              <p className="font-mono text-xl font-semibold text-zinc-900">
                {formatPrice(currentValue, quote.currency)}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${
                profit >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}
            >
              {formatSignedMoney(profit, quote.currency)} ({formatSignedPercent(profitPercent)})
            </span>
          </div>

          {series.length > 1 ? (
            <div className="mt-2">
              <Sparkline
                values={series}
                positive={profit >= 0}
                height={56}
                className="h-14 w-full"
              />
            </div>
          ) : null}

          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Invested</dt>
              <dd className="font-mono text-zinc-800">
                {formatPrice(totals.invested, quote.currency)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Shares</dt>
              <dd className="font-mono text-zinc-800">{totals.shares.toFixed(4)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Avg price</dt>
              <dd className="font-mono text-zinc-800">
                {formatPrice(totals.averagePrice, quote.currency)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Today</dt>
              <dd
                className={`font-mono ${
                  dayChange == null
                    ? "text-zinc-400"
                    : dayChange >= 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                }`}
              >
                {dayChange == null ? "—" : formatSignedMoney(dayChange, quote.currency)}
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Simulate a purchase to see how much it is worth each day. No real money involved.
        </p>
      )}

      <div className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">
            {currencySymbol(quote.currency)}
          </span>
          <input
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError(null);
            }}
            inputMode="decimal"
            aria-label={`Amount to invest in ${quote.symbol}`}
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 font-mono text-[13px] text-zinc-900 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          className="h-10 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-white transition hover:bg-emerald-600"
        >
          {hasPosition ? "Buy more" : "Buy"}
        </button>
      </div>

      {error ? <p className="mt-1.5 text-[11px] text-rose-600">{error}</p> : null}
    </section>
  );
}
