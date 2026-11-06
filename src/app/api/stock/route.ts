import { NextRequest, NextResponse } from "next/server";
import type { StockApiResponse, StockError, StockQuote } from "@/lib/types";
import { fetchStock, normalizeTicker } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TICKERS = 10;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const raw =
    searchParams.get("symbols") ??
    searchParams.get("symbol") ??
    "";

  const symbols = raw
    .split(",")
    .map(normalizeTicker)
    .filter(Boolean)
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, MAX_TICKERS);

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "Provide ?symbol=NVDA or ?symbols=NVDA,AAPL" },
      { status: 400 },
    );
  }

  const quotes: StockQuote[] = [];
  const errors: StockError[] = [];

  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        quotes.push(await fetchStock(symbol));
      } catch (err) {
        errors.push({
          symbol,
          error: err instanceof Error ? err.message : "Failed to fetch quote",
        });
      }
    }),
  );

  quotes.sort(
    (a, b) => symbols.indexOf(a.symbol) - symbols.indexOf(b.symbol),
  );

  const body: StockApiResponse = { quotes, errors };
  return NextResponse.json(body);
}
