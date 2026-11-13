import YahooFinance from "yahoo-finance2";
import type { StockNewsItem } from "./types";

const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const MAX_ITEMS = 5;
const MAX_AGE_DAYS = 180;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const JUNK_PATTERNS = [
  /stock price/i,
  /quote\s*&\s*(history|price)/i,
  /real[-\s]?time quote/i,
  /stock forum/i,
  /\bholdings?\b/i,
  /seasonal returns?/i,
  /price chart/i,
  /technical analysis/i,
  /^meta_title_quote/i,
];

const STOP_TOKENS = new Set([
  "inc", "inc.", "corp", "corp.", "corporation", "co", "co.", "company", "ltd", "ltd.",
  "limited", "plc", "the", "group", "holdings", "holding", "class", "etf", "index",
  "fund", "trust", "and", "of", "&", "global", "international", "emerging", "market",
  "markets", "capital", "growth", "value", "income", "dividend", "select", "core", "total",
  "world", "equity", "equities", "bond", "bonds", "balanced", "strategic", "opportunities",
  "opportunity", "series", "plus", "high", "yield", "small", "large", "mid", "cap", "sector",
]);

type RawNews = {
  title: string;
  publisher: string | null;
  link: string;
  publishedAt: string | null;
};

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_TOKENS.has(token));
}

function isRelevant(title: string, tokens: string[], base: string): boolean {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3);

  const hits = tokens.filter((token) => {
    const stem = token.slice(0, Math.min(6, token.length));
    return words.some((word) => word.startsWith(stem));
  }).length;

  // Ticker symbols are usually written in upper case in headlines, so match
  // them case-sensitively to avoid false hits on regular words.
  const baseHit =
    base.length >= 2 && new RegExp(`\\b${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(title);

  if (tokens.length === 0) return baseHit;
  // A bare ticker match is only trustworthy when the name has nothing distinctive.
  return hits >= 1 || (baseHit && tokens.length === 1);
}

function isFresh(publishedAt: string | null): boolean {
  if (!publishedAt) return true;
  const time = Date.parse(publishedAt);
  if (Number.isNaN(time)) return true;
  return Date.now() - time < MAX_AGE_DAYS * 86_400_000;
}

function isJunk(title: string): boolean {
  if (title.length < 12) return true;
  return JUNK_PATTERNS.some((pattern) => pattern.test(title));
}

function toIso(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }
  return null;
}

async function yahooNews(ticker: string): Promise<RawNews[]> {
  try {
    const result = await yahoo.search(ticker, { newsCount: 10, quotesCount: 0 });
    return (result.news ?? []).map((item) => ({
      title: String(item.title ?? "").trim(),
      publisher: item.publisher ?? null,
      link: String(item.link ?? ""),
      publishedAt: toIso(item.providerPublishTime),
    }));
  } catch {
    return [];
  }
}

async function googleNews(symbol: string, name: string, isFund: boolean): Promise<RawNews[]> {
  const query = isFund ? `"${name}"` : `${symbol} stock news`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-CA&gl=CA&ceid=CA:en`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return [];
    const xml = await response.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
      const block = match[1];
      const title = decodeEntities(
        (block.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1] ?? "",
      ).trim();
      const source = decodeEntities(
        (block.match(/<source[^>]*>([\s\S]*?)<\/source>/) ?? [])[1] ?? "",
      ).trim();
      const link = ((block.match(/<link>([\s\S]*?)<\/link>/) ?? [])[1] ?? "").trim();
      const date = ((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) ?? [])[1] ?? "").trim();
      return {
        title: title.replace(/\s+-\s+[^-]+$/, "").trim(),
        publisher: source || null,
        link,
        publishedAt: toIso(date),
      };
    });
  } catch {
    return [];
  }
}

function cleanup(items: RawNews[], tokens: string[], base: string): RawNews[] {
  const seen = new Set<string>();
  const out: RawNews[] = [];
  for (const item of items) {
    const key = item.title.toLowerCase();
    if (!item.title || !item.link || seen.has(key)) continue;
    seen.add(key);
    if (isJunk(item.title) || !isFresh(item.publishedAt) || !isRelevant(item.title, tokens, base)) {
      continue;
    }
    out.push(item);
  }
  out.sort((a, b) => Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? "") || 0);
  return out;
}

export async function fetchStockNews(
  symbol: string,
  name: string,
  base: string,
  quoteType: string | null,
): Promise<StockNewsItem[]> {
  const tokens = nameTokens(name);

  let items = cleanup(await yahooNews(symbol), tokens, base);
  if (items.length < 2) {
    const baseItems = cleanup(await yahooNews(base), tokens, base);
    if (baseItems.length > items.length) items = baseItems;
  }
  if (items.length < 2) {
    const isFund = quoteType === "ETF" || quoteType === "MUTUALFUND";
    const fallback = cleanup(await googleNews(symbol, name, isFund), tokens, base);
    if (fallback.length > items.length) items = fallback;
  }

  return items.slice(0, MAX_ITEMS).map((item) => ({
    title: item.title,
    publisher: item.publisher,
    link: item.link,
    publishedAt: item.publishedAt,
  }));
}
