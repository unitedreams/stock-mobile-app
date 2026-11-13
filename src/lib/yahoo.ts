import YahooFinance from "yahoo-finance2";
import { macd, rsi, sma } from "./indicators";
import { fetchStockNews } from "./news";
import { badgeForScore, fundamentalDrivers, fundamentalScore, technicalScore } from "./scores";
import type { StockDetails, StockMetrics, StockQuote } from "./types";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

function lookbackStart(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 10);
  d.setDate(d.getDate() - 15);
  return d;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function calcGrowth(
  quotes: Array<{ date?: Date | null; close?: number | null }>,
  lastClose: number,
  monthsAgo: number
): number | null {
  const target = new Date();
  target.setMonth(target.getMonth() - monthsAgo);
  const targetTime = target.getTime();

  const firstQuote = quotes.find(
    (q) => q.date instanceof Date && typeof q.close === "number"
  );
  if (!firstQuote?.date || firstQuote.date.getTime() > targetTime + 15 * 86400000) {
    return null;
  }

  for (let i = quotes.length - 1; i >= 0; i--) {
    const q = quotes[i];
    if (
      q.date instanceof Date &&
      q.date.getTime() <= targetTime &&
      typeof q.close === "number" &&
      q.close > 0
    ) {
      return ((lastClose - q.close) / q.close) * 100;
    }
  }
  return null;
}

export function normalizeTicker(raw: string): string {
  const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
  if (!clean) return "";
  if (!clean.includes(".")) {
    return `${clean}.TO`;
  }
  return clean;
}

async function fetchYahooData(ticker: string) {
  const chart = await yahooFinance.chart(ticker, {
    period1: lookbackStart(),
    interval: "1d",
  });
  const [live, summary] = await Promise.all([
    yahooFinance.quote(ticker).catch(() => null),
    yahooFinance
      .quoteSummary(ticker, {
        modules: [
          "price",
          "summaryDetail",
          "defaultKeyStatistics",
          "financialData",
          "assetProfile",
          "recommendationTrend",
        ],
      })
      .catch(() => null),
  ]);
  return { chart, live, summary, resolvedTicker: ticker };
}

export async function fetchStock(symbol: string): Promise<StockQuote> {
  const requestedTicker = normalizeTicker(symbol);
  if (!requestedTicker) {
    throw new Error("Invalid ticker");
  }

  const base = requestedTicker.split(".")[0];
  // امتحان کردن خودکار بورس تورنتو (.TO)، بورس نئو کانادا (.NE) و نماد پایه
  const candidates = Array.from(new Set([requestedTicker, `${base}.TO`, `${base}.NE`, base]));

  let data = null;
  for (const candidate of candidates) {
    try {
      const res = await fetchYahooData(candidate);
      if ((res.chart.quotes ?? []).length >= 5) {
        data = res;
        break;
      }
    } catch {
      // امتحان کردن پسوند بعدی
    }
  }

  if (!data) {
    throw new Error(`Symbol not found on TSX/NEO`);
  }

  const { chart, live, summary } = data;
  const rawQuotes = chart.quotes ?? [];
  const closes = rawQuotes
    .map((q) => q.close)
    .filter((c): c is number => typeof c === "number" && Number.isFinite(c));

  const lastClose = closes[closes.length - 1];
  const prevClose = closes.length > 1 ? closes[closes.length - 2] : null;
  const derivedChange =
    prevClose && prevClose !== 0 ? ((lastClose - prevClose) / prevClose) * 100 : null;
  const macdResult = macd(closes);
  const financial = summary?.financialData;
  const stats = summary?.defaultKeyStatistics;
  const price = summary?.price;
  const detail = summary?.summaryDetail;
  const profile = summary?.assetProfile;
  const analystTrend = summary?.recommendationTrend?.trend?.[0];

  const metrics: StockMetrics = {
    rsi: rsi(closes, 14),
    macd: macdResult?.macd ?? null,
    macdSignal: macdResult?.signal ?? null,
    macdHistogram: macdResult?.histogram ?? null,
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    forwardPE: num(stats?.forwardPE) ?? num(detail?.forwardPE),
    revenueGrowth: num(financial?.revenueGrowth),
    profitMargins: num(financial?.profitMargins),
    recommendationMean: num(financial?.recommendationMean),
  };

  const tech = technicalScore(metrics, lastClose);
  const fund = fundamentalScore(metrics);
  const drivers = fundamentalDrivers(metrics);

  const details: StockDetails = {
    sector: profile?.sector ?? null,
    industry: profile?.industry ?? null,
    quoteType: live?.quoteType ?? price?.quoteType ?? null,
    trailingPE: num(detail?.trailingPE),
    pegRatio: num(stats?.pegRatio),
    priceToBook: num(stats?.priceToBook),
    priceToSales: num(detail?.priceToSalesTrailing12Months),
    enterpriseToEbitda: num(stats?.enterpriseToEbitda),
    dividendYield: num(detail?.dividendYield),
    payoutRatio: num(detail?.payoutRatio),
    grossMargins: num(financial?.grossMargins),
    operatingMargins: num(financial?.operatingMargins),
    returnOnEquity: num(financial?.returnOnEquity),
    returnOnAssets: num(financial?.returnOnAssets),
    earningsGrowth: num(financial?.earningsGrowth),
    debtToEquity: num(financial?.debtToEquity),
    currentRatio: num(financial?.currentRatio),
    quickRatio: num(financial?.quickRatio),
    freeCashflow: num(financial?.freeCashflow),
    totalCash: num(financial?.totalCash),
    totalDebt: num(financial?.totalDebt),
    marketCap: num(price?.marketCap) ?? num(detail?.marketCap),
    beta: num(detail?.beta) ?? num(stats?.beta),
    fiftyTwoWeekLow: num(detail?.fiftyTwoWeekLow),
    fiftyTwoWeekHigh: num(detail?.fiftyTwoWeekHigh),
    fiftyDayAverage: num(detail?.fiftyDayAverage),
    twoHundredDayAverage: num(detail?.twoHundredDayAverage),
    averageVolume: num(detail?.averageVolume),
    targetMeanPrice: num(financial?.targetMeanPrice),
    targetHighPrice: num(financial?.targetHighPrice),
    targetLowPrice: num(financial?.targetLowPrice),
    numberOfAnalystOpinions: num(financial?.numberOfAnalystOpinions),
    recommendationKey: financial?.recommendationKey ?? null,
    analysts: analystTrend
      ? {
          strongBuy: analystTrend.strongBuy ?? 0,
          buy: analystTrend.buy ?? 0,
          hold: analystTrend.hold ?? 0,
          sell: analystTrend.sell ?? 0,
          strongSell: analystTrend.strongSell ?? 0,
        }
      : null,
  };

  const name =
    live?.shortName ||
    live?.longName ||
    price?.shortName ||
    price?.longName ||
    data.resolvedTicker;

  const news = await fetchStockNews(
    requestedTicker,
    name,
    base,
    live?.quoteType ?? price?.quoteType ?? null,
  ).catch(() => []);

  return {
    symbol: requestedTicker,
    resolvedSymbol: data.resolvedTicker,
    name,
    price:
      num(live?.regularMarketPrice) ??
      num(price?.regularMarketPrice) ??
      num(chart.meta.regularMarketPrice) ??
      lastClose,
    changePercent:
      num(live?.regularMarketChangePercent) ?? derivedChange,
    currency: live?.currency ?? price?.currency ?? "CAD",
    sparkline: [],
    returns: {
      m1: calcGrowth(rawQuotes, lastClose, 1),
      m3: calcGrowth(rawQuotes, lastClose, 3),
      y1: calcGrowth(rawQuotes,lastClose, 12),
      y5: calcGrowth(rawQuotes, lastClose, 60),
      y10: calcGrowth(rawQuotes, lastClose, 120),
    },
    technicalScore: tech,
    fundamentalScore: fund,
    technicalBadge: badgeForScore(tech),
    fundamentalBadge: badgeForScore(fund),
    metrics,
    details,
    fundamentalDrivers: drivers,
    news,
  };
}
