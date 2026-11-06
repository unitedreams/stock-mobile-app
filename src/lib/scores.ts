import type { Badge, ScoreDriver, StockMetrics } from "./types";
import { clampScore } from "./indicators";

export function badgeForScore(score: number): Badge {
  if (score >= 1.5) return "Buy";
  if (score <= -1.5) return "Avoid";
  return "Hold";
}

export function technicalScore(metrics: StockMetrics, lastClose: number | null): number {
  let score = 0;
  const { rsi, macd, macdSignal, macdHistogram, sma50, sma200 } = metrics;

  if (rsi != null) {
    if (rsi < 30) score += 1.6;
    else if (rsi > 70) score -= 1.6;
    else score += ((rsi - 50) / 20) * 0.8;
  }

  if (macd != null && macdSignal != null && macdHistogram != null) {
    if (macd > macdSignal) score += 1.2;
    else score -= 1.2;
    score += Math.max(-0.8, Math.min(0.8, macdHistogram * 4));
  }

  if (lastClose != null && sma50 != null) {
    score += lastClose > sma50 ? 0.9 : -0.9;
  }

  if (sma50 != null && sma200 != null) {
    score += sma50 > sma200 ? 1.3 : -1.3;
  } else if (lastClose != null && sma50 != null) {
    score += lastClose > sma50 ? 0.4 : -0.4;
  }

  return clampScore(score);
}

export function fundamentalDrivers(metrics: StockMetrics): ScoreDriver[] {
  const drivers: ScoreDriver[] = [];
  const { forwardPE, revenueGrowth, profitMargins, recommendationMean } = metrics;

  if (forwardPE != null) {
    let points = -1.3;
    let detail = "Very expensive";
    if (forwardPE <= 0) {
      points = -1.4;
      detail = "Negative earnings";
    } else if (forwardPE < 15) {
      points = 1.5;
      detail = "Cheap";
    } else if (forwardPE < 25) {
      points = 0.6;
      detail = "Fair";
    } else if (forwardPE < 40) {
      points = -0.4;
      detail = "Rich";
    }
    drivers.push({ key: "forwardPE", label: "Forward P/E", detail, points });
  }

  if (revenueGrowth != null) {
    const pct = revenueGrowth * 100;
    let points = -1.5;
    let detail = "Contracting fast";
    if (pct >= 25) {
      points = 1.6;
      detail = "High growth";
    } else if (pct >= 10) {
      points = 1.0;
      detail = "Solid growth";
    } else if (pct >= 0) {
      points = 0.2;
      detail = "Flat";
    } else if (pct >= -10) {
      points = -0.8;
      detail = "Shrinking";
    }
    drivers.push({ key: "revenueGrowth", label: "Revenue growth", detail, points });
  }

  if (profitMargins != null) {
    const pct = profitMargins * 100;
    let points = -1.3;
    let detail = "Losing money";
    if (pct >= 25) {
      points = 1.3;
      detail = "Excellent";
    } else if (pct >= 12) {
      points = 0.7;
      detail = "Healthy";
    } else if (pct >= 0) {
      points = 0.1;
      detail = "Thin";
    }
    drivers.push({ key: "profitMargins", label: "Net margin", detail, points });
  }

  if (recommendationMean != null) {
    let points = -1.6;
    let detail = "Sell";
    if (recommendationMean <= 1.6) {
      points = 1.6;
      detail = "Strong buy";
    } else if (recommendationMean <= 2.5) {
      points = 0.8;
      detail = "Buy";
    } else if (recommendationMean <= 3.5) {
      points = 0;
      detail = "Neutral";
    } else if (recommendationMean <= 4.2) {
      points = -0.8;
      detail = "Underperform";
    }
    drivers.push({ key: "recommendationMean", label: "Analyst rating", detail, points });
  }

  return drivers;
}

export function fundamentalScore(metrics: StockMetrics): number {
  const drivers = fundamentalDrivers(metrics);
  if (drivers.length === 0) return 0;
  return clampScore(drivers.reduce((sum, driver) => sum + driver.points, 0));
}
