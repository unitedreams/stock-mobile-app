"use client";

import { useCallback, useEffect, useState } from "react";

export const DEFAULT_WATCHLIST = [
  "VFV.TO",
  "XQQ.TO",
  "SHOP.TO",
  "RY.TO",
  "ENB.TO",
];
export const MAX_WATCHLIST = 10;
const STORAGE_KEY = "pulse-tsx-watchlist";

function normalize(ticker: string): string {
  const clean = ticker.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
  if (!clean) return "";
  if (!clean.includes(".")) {
    return `${clean}.TO`;
  }
  return clean;
}

export function useWatchlist() {
  const [tickers, setTickers] = useState<string[]>(DEFAULT_WATCHLIST);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed
            .map((t) => (typeof t === "string" ? normalize(t) : ""))
            .filter(Boolean)
            .filter((t, i, arr) => arr.indexOf(t) === i)
            .slice(0, MAX_WATCHLIST);
          if (cleaned.length > 0) setTickers(cleaned);
        }
      }
    } catch {
      // keep defaults
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
  }, [tickers, hydrated]);

  const addTicker = useCallback((raw: string): string | null => {
    const ticker = normalize(raw);
    if (!ticker) return "Enter a ticker symbol";
    if (tickers.includes(ticker)) return `${ticker} is already on your list`;
    if (tickers.length >= MAX_WATCHLIST) return "Watchlist is limited to 10 tickers";
    setTickers((prev) => [...prev, ticker]);
    return null;
  }, [tickers]);

  const removeTicker = useCallback((ticker: string) => {
    setTickers((prev) => prev.filter((t) => t !== ticker));
  }, []);

  return { tickers, addTicker, removeTicker, hydrated, max: MAX_WATCHLIST };
}
