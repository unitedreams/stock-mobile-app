export type Badge = "Buy" | "Hold" | "Avoid";

export type ScoreDriver = {
  key: string;
  label: string;
  detail: string;
  points: number;
};

export type AnalystTrend = {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
};

export type StockDetails = {
  sector: string | null;
  industry: string | null;
  quoteType: string | null;
  trailingPE: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  enterpriseToEbitda: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  grossMargins: number | null;
  operatingMargins: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  earningsGrowth: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  freeCashflow: number | null;
  totalCash: number | null;
  totalDebt: number | null;
  marketCap: number | null;
  beta: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyDayAverage: number | null;
  twoHundredDayAverage: number | null;
  averageVolume: number | null;
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  numberOfAnalystOpinions: number | null;
  recommendationKey: string | null;
  analysts: AnalystTrend | null;
};

export type StockNewsItem = {
  title: string;
  publisher: string | null;
  link: string;
  publishedAt: string | null;
};

export type Position = {
  id: string;
  symbol: string;
  name: string;
  invested: number;
  shares: number;
  buyPrice: number;
  currency: string;
  boughtAt: string;
};

export type HistoryPoint = {
  date: string;
  close: number;
};

export type StockMetrics = {
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  sma50: number | null;
  sma200: number | null;
  forwardPE: number | null;
  revenueGrowth: number | null;
  profitMargins: number | null;
  recommendationMean: number | null;
};

export type StockReturns = {
  m1: number | null;
  m3: number | null;
  y1: number | null;
  y5: number | null;
  y10: number | null;
};

export type StockQuote = {
  symbol: string;
  resolvedSymbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  currency: string;
  sparkline: number[];
  returns?: StockReturns;
  historyStart: string | null;
  sinceListing: number | null;
  technicalScore: number;
  fundamentalScore: number;
  technicalBadge: Badge;
  fundamentalBadge: Badge;
  metrics: StockMetrics;
  details: StockDetails;
  fundamentalDrivers: ScoreDriver[];
  news: StockNewsItem[];
};

export type StockError = {
  symbol: string;
  error: string;
};

export type StockApiResponse = {
  quotes: StockQuote[];
  errors: StockError[];
};
