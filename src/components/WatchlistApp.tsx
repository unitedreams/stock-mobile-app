"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, TrendingUp } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import type { StockApiResponse, StockQuote } from "@/lib/types";
import { StockCard } from "./StockCard";

export function WatchlistApp() {
  const { tickers, addTicker, removeTicker, max, hydrated } = useWatchlist();
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (symbols: string[], silent = false) => {
    if (symbols.length === 0) {
      setQuotes([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/stock?symbols=${encodeURIComponent(symbols.join(","))}`);
      const data = (await res.json()) as StockApiResponse & { error?: string };
      if (!res.ok) {
        setMessage(data.error || "Could not load quotes");
        return;
      }
      setQuotes(data.quotes);
      if (data.errors.length > 0) {
        setMessage(
          data.errors.map((e) => `${e.symbol}: ${e.error}`).join(" · "),
        );
      } else {
        setMessage(null);
      }
    } catch {
      setMessage("Network error while loading quotes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void load(tickers);
  }, [tickers, load, hydrated]);

  function onAdd(event: FormEvent) {
    event.preventDefault();
    const error = addTicker(input);
    if (error) {
      setMessage(error);
      return;
    }
    setInput("");
    setMessage(null);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Pulse TSX
            </h1>
            <p className="text-xs text-zinc-500">
              {tickers.length}/{max} tickers (CAD)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load(tickers, true)}
          className="rounded-full border border-zinc-200 bg-white p-2.5 text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
          aria-label="Refresh quotes"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </header>

      <form onSubmit={onAdd} className="mb-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Add TSX ticker (e.g. VFV, SHOP, RY)"
          maxLength={12}
          className="h-12 flex-1 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none ring-emerald-500/0 placeholder:text-zinc-400 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10"
        />
        <button
          type="submit"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white transition hover:bg-emerald-600"
          aria-label="Add ticker"
        >
          <Plus className="h-5 w-5" />
        </button>
      </form>

      {message ? (
        <p className="mb-3 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {message}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {loading && quotes.length === 0
          ? tickers.map((t) => <SkeletonCard key={t} />)
          : null}

        {quotes.map((quote) => (
          <StockCard key={quote.symbol} quote={quote} onRemove={removeTicker} />
        ))}

        {!loading && tickers.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">
            Add up to 10 TSX tickers to start tracking.
          </p>
        ) : null}

        {!loading &&
          tickers
            .filter((t) => !quotes.some((q) => q.symbol === t))
            .map((t) => (
              <div
                key={t}
                className="flex items-center justify-between rounded-3xl border border-zinc-200 bg-white px-4 py-3"
              >
                <span className="font-medium text-zinc-700">{t}</span>
                <button
                  type="button"
                  onClick={() => removeTicker(t)}
                  className="text-xs text-zinc-500 hover:text-zinc-900"
                >
                  Remove
                </button>
              </div>
            ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-3xl border border-zinc-200 bg-white p-4">
      <div className="h-5 w-24 rounded bg-zinc-200" />
      <div className="mt-2 h-3 w-40 rounded bg-zinc-200" />
      <div className="mt-4 h-8 w-32 rounded bg-zinc-200" />
      <div className="mt-5 h-8 rounded-full bg-zinc-200" />
    </div>
  );
}
