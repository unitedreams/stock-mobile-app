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
const WATCHLIST_KEY = "pulse-tsx-watchlist";
const ARCHIVE_KEY = "pulse-tsx-archive";
const MAX_ARCHIVE = 50;

function normalize(ticker: string): string {
  const clean = ticker.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
  if (!clean) return "";
  if (!clean.includes(".")) {
    return `${clean}.TO`;
  }
  return clean;
}

function readStoredList(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((ticker) => (typeof ticker === "string" ? normalize(ticker) : ""))
      .filter(Boolean)
      .filter((ticker, index, list) => list.indexOf(ticker) === index);
  } catch {
    return null;
  }
}

export function useWatchlist() {
  const [tickers, setTickers] = useState<string[]>(DEFAULT_WATCHLIST);
  const [archived, setArchived] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void (async () => {
      const stored = readStoredList(WATCHLIST_KEY);
      const storedArchive = readStoredList(ARCHIVE_KEY) ?? [];
      const list =
        stored && stored.length > 0 ? stored.slice(0, MAX_WATCHLIST) : DEFAULT_WATCHLIST;
      setTickers(list);
      setArchived(
        storedArchive.filter((ticker) => !list.includes(ticker)).slice(0, MAX_ARCHIVE),
      );
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(tickers));
  }, [tickers, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archived));
  }, [archived, hydrated]);

  const addExact = useCallback((raw: string): string | null => {
    const ticker = raw.trim().toUpperCase();
    if (!ticker) return "Enter a ticker symbol";
    if (tickers.includes(ticker)) return `${ticker} is already on your list`;
    if (tickers.length >= MAX_WATCHLIST) return "Watchlist is limited to 10 tickers";
    setTickers((prev) => [...prev, ticker]);
    setArchived((prev) => prev.filter((item) => item !== ticker));
    return null;
  }, [tickers]);

  const addTicker = useCallback((raw: string): string | null => {
    const ticker = normalize(raw);
    if (!ticker) return "Enter a ticker symbol";
    return addExact(ticker);
  }, [addExact]);

  const removeTicker = useCallback((ticker: string) => {
    setTickers((prev) => prev.filter((item) => item !== ticker));
  }, []);

  const archiveTicker = useCallback((ticker: string) => {
    setTickers((prev) => prev.filter((item) => item !== ticker));
    setArchived((prev) =>
      [ticker, ...prev.filter((item) => item !== ticker)].slice(0, MAX_ARCHIVE),
    );
  }, []);

  const restoreTicker = useCallback((ticker: string): string | null => {
    if (!archived.includes(ticker)) return null;
    if (!tickers.includes(ticker)) {
      if (tickers.length >= MAX_WATCHLIST) {
        return "Watchlist is limited to 10 tickers — remove one before restoring";
      }
      setTickers((prev) => [...prev, ticker]);
    }
    setArchived((prev) => prev.filter((item) => item !== ticker));
    return null;
  }, [archived, tickers]);

  return {
    tickers,
    archived,
    addTicker,
    addExact,
    removeTicker,
    archiveTicker,
    restoreTicker,
    hydrated,
    max: MAX_WATCHLIST,
  };
}
