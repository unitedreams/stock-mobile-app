"use client";

import { ExternalLink } from "lucide-react";
import type { Position, StockQuote } from "@/lib/types";
import { formatPoints } from "@/lib/format";
import { PositionSection } from "./PositionSection";

type StockDetailsProps = {
  quote: StockQuote;
  positions: Position[];
  onBuy: (quote: StockQuote, amount: number) => string | null;
  onSell: (symbol: string) => void;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

function NewsPanel({ quote }: { quote: StockQuote }) {
  const news = quote.news ?? [];

  return (
    <section>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        News
      </h3>
      {news.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[12px] leading-relaxed text-zinc-500">
          {quote.details.quoteType === "ETF" || quote.details.quoteType === "MUTUALFUND"
            ? "Funds rarely get dedicated coverage — no recent news found for this symbol."
            : "No recent news found for this symbol."}
        </p>
      ) : (
        <ul className="space-y-2">
          {news.map((item) => (
            <li
              key={item.link}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5"
            >
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[12px] font-medium leading-relaxed text-zinc-800 transition hover:text-emerald-700"
              >
                {item.title}
              </a>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  {item.publisher ? <span>{item.publisher}</span> : null}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </span>
                <span>{timeAgo(item.publishedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ScoreBreakdown({ quote }: { quote: StockQuote }) {
  const drivers = quote.fundamentalDrivers ?? [];

  return (
    <section className="mt-4">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        Why this score
      </h3>
      {drivers.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-500">
          No company fundamentals for this symbol — funds do not report these metrics, so the
          fundamental score does not apply.
        </p>
      ) : (
        <div className="space-y-1.5">
          {drivers.map((driver) => (
            <div
              key={driver.key}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-zinc-700">{driver.label}</p>
                <p className="text-[10px] text-zinc-400">{driver.detail}</p>
              </div>
              <span
                className={`ml-2 shrink-0 font-mono text-[12px] font-semibold ${
                  driver.points > 0
                    ? "text-emerald-600"
                    : driver.points < 0
                      ? "text-rose-600"
                      : "text-zinc-400"
                }`}
              >
                {formatPoints(driver.points)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function StockDetails({ quote, positions, onBuy, onSell }: StockDetailsProps) {
  const details = quote.details;
  const tags = [details.quoteType, details.sector, details.industry].filter(
    (tag): tag is string => Boolean(tag),
  );

  const alias = quote.resolvedSymbol !== quote.symbol ? quote.resolvedSymbol : null;

  return (
    <div className="border-t border-zinc-100 pt-3">
      {alias ? (
        <p className="mb-2 rounded-xl bg-zinc-50 px-3 py-2 text-[10px] leading-relaxed text-zinc-500">
          Listed as <span className="font-mono font-semibold text-zinc-700">{alias}</span> on
          Yahoo Finance — {quote.symbol} is the TSX-style notation for this listing.
        </p>
      ) : null}
      {tags.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <span
              key={tag}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                index === 1 ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <NewsPanel quote={quote} />
      <PositionSection quote={quote} positions={positions} onBuy={onBuy} onSell={onSell} />
      <ScoreBreakdown quote={quote} />
    </div>
  );
}
