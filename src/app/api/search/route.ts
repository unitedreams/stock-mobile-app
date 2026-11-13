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

function isSupported(quote: YahooQuote): boolean {
  const symbol = quote.symbol ?? "";
  if (!symbol || symbol.includes("^") || symbol.includes("=")) return false;
  return quote.quoteType === "EQUITY" || quote.quoteType === "ETF";
}

// Yahoo indexes Canadian ETFs by exchange suffix: the Fidelity Global Innovators
// ETF is FINN.NE on Cboe Canada and has no FINN.TO listing, so an exact "FINN.TO"
// query returns nothing. Probe the other Canadian suffixes before giving up.
function tickerVariants(query: string): string[] {
  const value = query.toUpperCase().trim();
  if (!/^[A-Z0-9-]{1,12}(\.[A-Z]{1,3})?$/.test(value)) return [];

  const base = value.split(".")[0];
  const variants = value.includes(".")
    ? [`${base}.NE`, `${base}.TO`, base]
    : [`${base}.TO`, `${base}.NE`];

  return variants.filter((variant) => variant !== value).slice(0, 3);
}

async function searchQuotes(query: string): Promise<YahooQuote[]> {
  try {
    const response = await yahoo.search(query, {
      quotesCount: 15,
      newsCount: 0,
      enableFuzzyQuery: false,
    });
    return (response.quotes ?? []).map((quote) => quote as YahooQuote).filter(isSupported);
  } catch {
    return [];
  }
}

function toResult(quote: YahooQuote): SearchResult {
  const symbol = quote.symbol ?? "";
  const exchange = quote.exchange ?? null;
  return {
    symbol,
    name: quote.shortname ?? quote.longname ?? symbol,
    exchange,
    quoteType: quote.quoteType ?? null,
    canadian: isCanadian(symbol, exchange),
  };
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (query.length < 1) {
    return NextResponse.json({ results: [] });
  }

  let quotes = await searchQuotes(query);

  if (quotes.length === 0) {
    const probes = await Promise.all(tickerVariants(query).map(searchQuotes));
    quotes = probes.flat();
  }

  const results = quotes
    .map(toResult)
    .filter((result, index, all) => all.findIndex((item) => item.symbol === result.symbol) === index)
    .sort((a, b) => {
      const needle = query.toUpperCase();
      const exactA = a.symbol.toUpperCase() === needle ? 0 : 1;
      const exactB = b.symbol.toUpperCase() === needle ? 0 : 1;
      if (exactA !== exactB) return exactA - exactB;

      if (a.canadian !== b.canadian) return a.canadian ? -1 : 1;

      const equityA = a.quoteType === "EQUITY" ? 0 : 1;
      const equityB = b.quoteType === "EQUITY" ? 0 : 1;
      return equityA - equityB;
    })
    .slice(0, 8);

  return NextResponse.json({ results });
}
