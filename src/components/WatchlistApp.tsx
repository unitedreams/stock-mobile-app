"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw, Search, TrendingUp } from "lucide-react";
import { usePositions } from "@/hooks/usePositions";
import { useWatchlist } from "@/hooks/useWatchlist";
import { formatPrice, formatSignedMoney, formatSignedPercent } from "@/lib/format";
import type { StockApiResponse, StockQuote } from "@/lib/types";
import { StockCard } from "./StockCard";

type SearchResult = {
  symbol: string;
  name: string;
  exchange: string | null;
  quoteType: string | null;
  canadian: boolean;
};

export function WatchlistApp() {
  const { tickers, addTicker, addExact, removeTicker, max, hydrated } = useWatchlist();
  const { positions, buy, sellAll } = usePositions();
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setMessage(data.errors.map((e) => `${e.symbol}: ${e.error}`).join(" · "));
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

  useEffect(() => {
    const query = input.trim();
    if (query.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { results?: SearchResult[] } | null) => {
          if (cancelled) return;
          setResults(Array.isArray(data?.results) ? data.results : []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input]);

  const portfolio = useMemo(() => {
    const prices = new Map(quotes.map((quote) => [quote.symbol, quote]));
    let invested = 0;
    let value = 0;
    for (const position of positions) {
      invested += position.invested;
      const price = prices.get(position.symbol)?.price ?? position.buyPrice;
      value += position.shares * price;
    }
    const profit = value - invested;
    return {
      invested,
      value,
      profit,
      percent: invested > 0 ? (profit / invested) * 100 : 0,
      currency: positions[0]?.currency ?? "CAD",
    };
  }, [positions, quotes]);

  function commit(raw: string, exact: boolean): boolean {
    const error = exact ? addExact(raw) : addTicker(raw);
    if (error) {
      setMessage(error);
      return false;
    }
    setInput("");
    setResults([]);
    setShowResults(false);
    setMessage(null);
    return true;
  }

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    const query = input.trim();
    if (!query) return;

    const exactMatch = results.find(
      (result) => result.symbol.toUpperCase() === query.toUpperCase(),
    );
    if (exactMatch) {
      commit(exactMatch.symbol, true);
      return;
    }
    if (results.length > 0) {
      commit(results[0].symbol, true);
      return;
    }

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = (await response.json()) as { results?: SearchResult[] } | null;
      const first = data?.results?.[0];
      if (first) {
        commit(first.symbol, true);
        return;
      }
    } catch {
      // fall through to plain ticker handling
    }
    commit(query, false);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Pulse TSX</h1>
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

      <form
        onSubmit={(event) => {
          void onAdd(event);
        }}
        className="mb-4 flex gap-2"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <input
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            onBlur={() => {
              closeTimer.current = setTimeout(() => setShowResults(false), 120);
            }}
            placeholder="Search company or ticker (e.g. Shopify, RY)"
            aria-label="Search for a company or ticker"
            maxLength={40}
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 outline-none ring-emerald-500/0 placeholder:text-zinc-400 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10"
          />
          {showResults && input.trim().length >= 2 && (results.length > 0 || searching) ? (
            <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white py-1 shadow-lg">
              {results.map((result) => (
                <li key={result.symbol}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      if (closeTimer.current) clearTimeout(closeTimer.current);
                      commit(result.symbol, true);
                    }}
                    className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left transition hover:bg-zinc-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold text-zinc-900">
                        {result.symbol}
                      </span>
                      <span className="block truncate text-[10px] text-zinc-500">
                        {result.name}
                      </span>
                    </span>
                    {result.canadian ? (
                      <span className="mt-0.5 shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                        CA
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
              {searching && results.length === 0 ? (
                <li className="px-3 py-2 text-[11px] text-zinc-400">Searching…</li>
              ) : null}
            </ul>
          ) : null}
        </div>
        <button
          type="submit"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white transition hover:bg-emerald-600"
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

      {positions.length > 0 ? (
        <div className="mb-3 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Paper portfolio
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${
                portfolio.profit >= 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {formatSignedPercent(portfolio.percent)}
            </span>
          </div>
          <div className="mt-1.5 flex items-end justify-between">
            <p className="font-mono text-2xl font-medium tracking-tight text-zinc-900">
              {formatPrice(portfolio.value, portfolio.currency)}
            </p>
            <p
              className={`font-mono text-[12px] font-semibold ${
                portfolio.profit >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatSignedMoney(portfolio.profit, portfolio.currency)}
            </p>
          </div>
          <p className="mt-0.5 text-[10px] text-zinc-500">
            Invested {formatPrice(portfolio.invested, portfolio.currency)}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {loading && quotes.length === 0 ? tickers.map((t) => <SkeletonCard key={t} />) : null}

        {quotes.map((quote) => (
          <StockCard
            key={quote.symbol}
            quote={quote}
            positions={positions.filter((position) => position.symbol === quote.symbol)}
            onRemove={removeTicker}
            onBuy={buy}
            onSell={sellAll}
          />
        ))}

        {!loading && tickers.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">
            Search for a company or add a ticker to start tracking.
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
