import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const CANADIAN_SUFFIXES = [".TO", ".NE", ".V"];
const CANADIAN_EXCHANGES = new Set(["TOR", "NEO", "TSXV", "CVE", "CNQ"]);

type YahooQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
};

type SearchResult = {
  symbol: string;
  name: string;
  exchange: string | null;
  quoteType: string | null;
  canadian: boolean;
};

function isCanadian(symbol: string, exchange: string | null): boolean {
  if (CANADIAN_SUFFIXES.some((suffix) => symbol.endsWith(suffix))) return true;
  return exchange != null && CANADIAN_EXCHANGES.has(exchange);
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (query.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const response = await yahoo.search(query, {
      quotesCount: 15,
      newsCount: 0,
      enableFuzzyQuery: false,
    });

    const results: SearchResult[] = (response.quotes ?? [])
      .map((quote) => quote as YahooQuote)
      .filter((quote) => {
        const symbol = quote.symbol ?? "";
        if (!symbol || symbol.includes("^") || symbol.includes("=")) return false;
        const type = quote.quoteType ?? "";
        return type === "EQUITY" || type === "ETF";
      })
      .map((quote, index) => {
        const symbol = quote.symbol ?? "";
        const exchange = quote.exchange ?? null;
        return {
          symbol,
          name: quote.shortname ?? quote.longname ?? symbol,
          exchange,
          quoteType: quote.quoteType ?? null,
          canadian: isCanadian(symbol, exchange),
          index,
        };
      })
      .sort((a, b) => {
        const needle = query.toUpperCase();
        const exactA = a.symbol.toUpperCase() === needle ? 0 : 1;
        const exactB = b.symbol.toUpperCase() === needle ? 0 : 1;
        if (exactA !== exactB) return exactA - exactB;

        const equityA = a.quoteType === "EQUITY" ? 0 : 1;
        const equityB = b.quoteType === "EQUITY" ? 0 : 1;
        if (equityA !== equityB) return equityA - equityB;

        if (a.canadian !== b.canadian) return a.canadian ? -1 : 1;
        return a.index - b.index;
      })
      .slice(0, 8)
      .map((result) => ({
        symbol: result.symbol,
        name: result.name,
        exchange: result.exchange,
        quoteType: result.quoteType,
        canadian: result.canadian,
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
