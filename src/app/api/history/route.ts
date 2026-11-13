import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import type { HistoryPoint } from "@/lib/types";
import { normalizeTicker } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

function parseDate(value: string | null): Date {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() - 1);
  return fallback;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const symbol = normalizeTicker(params.get("symbol") ?? "");
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const from = parseDate(params.get("from"));

  try {
    const chart = await yahoo.chart(symbol, { period1: from, interval: "1d" });
    const points: HistoryPoint[] = (chart.quotes ?? [])
      .filter(
        (quote) =>
          quote.date instanceof Date &&
          typeof quote.close === "number" &&
          Number.isFinite(quote.close),
      )
      .map((quote) => ({
        date: (quote.date as Date).toISOString().slice(0, 10),
        close: quote.close as number,
      }));

    return NextResponse.json(
      { symbol, points },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json(
      { symbol, points: [] },
      { headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
