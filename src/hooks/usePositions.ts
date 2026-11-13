"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getPositionsServerSnapshot,
  getPositionsSnapshot,
  subscribePositions,
  writePositions,
} from "@/lib/positionStore";
import type { Position, StockQuote } from "@/lib/types";

export type PositionSummary = {
  symbol: string;
  name: string;
  invested: number;
  shares: number;
  averagePrice: number;
  currency: string;
  boughtAt: string;
  count: number;
};

export function summarizePositions(positions: Position[]): Map<string, PositionSummary> {
  const map = new Map<string, PositionSummary>();
  for (const position of positions) {
    const current = map.get(position.symbol);
    if (!current) {
      map.set(position.symbol, {
        symbol: position.symbol,
        name: position.name,
        invested: position.invested,
        shares: position.shares,
        averagePrice: position.buyPrice,
        currency: position.currency,
        boughtAt: position.boughtAt,
        count: 1,
      });
      continue;
    }
    const invested = current.invested + position.invested;
    const shares = current.shares + position.shares;
    map.set(position.symbol, {
      ...current,
      invested,
      shares,
      averagePrice: shares > 0 ? invested / shares : current.averagePrice,
      boughtAt: position.boughtAt < current.boughtAt ? position.boughtAt : current.boughtAt,
      count: current.count + 1,
    });
  }
  return map;
}

export function usePositions() {
  const positions = useSyncExternalStore(
    subscribePositions,
    getPositionsSnapshot,
    getPositionsServerSnapshot,
  );

  const buy = useCallback((quote: StockQuote, amount: number): string | null => {
    const price = quote.price;
    if (price == null || !Number.isFinite(price) || price <= 0) {
      return "No price available for this symbol";
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return "Enter an amount greater than zero";
    }
    const invested = Math.round(amount * 100) / 100;
    writePositions([
      ...getPositionsSnapshot(),
      {
        id: `${quote.symbol}-${Date.now()}`,
        symbol: quote.symbol,
        name: quote.name,
        invested,
        shares: invested / price,
        buyPrice: price,
        currency: quote.currency,
        boughtAt: new Date().toISOString().slice(0, 10),
      },
    ]);
    return null;
  }, []);

  const sellAll = useCallback((symbol: string) => {
    writePositions(getPositionsSnapshot().filter((position) => position.symbol !== symbol));
  }, []);

  return { positions, buy, sellAll };
}
