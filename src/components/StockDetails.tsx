"use client";

import { ExternalLink } from "lucide-react";
import type { StockQuote } from "@/lib/types";
import { formatPoints } from "@/lib/format";

const driverLabels: Record<string, string> = {
  forwardPE: "P/E آینده",
  revenueGrowth: "رشد درآمد",
  profitMargins: "حاشیه سود خالص",
  recommendationMean: "نظر تحلیلگران",
};

const driverDetails: Record<string, string> = {
  "Negative earnings": "زیان‌ده",
  Cheap: "ارزان",
  Fair: "منصفانه",
  Rich: "گران",
  "Very expensive": "خیلی گران",
  "High growth": "رشد بالا",
  "Solid growth": "رشد مناسب",
  Flat: "بدون رشد",
  Shrinking: "کاهشی",
  "Contracting fast": "افت شدید",
  Excellent: "عالی",
  Healthy: "سالم",
  Thin: "نازک",
  "Losing money": "زیان‌ده",
  "Strong buy": "خرید قوی",
  Buy: "خرید",
  Neutral: "خنثی",
  Underperform: "ضعیف",
  Sell: "فروش",
};

function timeAgoFa(iso: string | null): string {
  if (!iso) return "";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60_000));
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} روز پیش`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} ماه پیش`;
  return `${Math.round(months / 12)} سال پیش`;
}

function NewsPanel({ quote }: { quote: StockQuote }) {
  const news = quote.news ?? [];

  return (
    <section>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        اخبار مهم
      </h3>
      {news.length === 0 ? (
        <p
          dir="rtl"
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[12px] leading-relaxed text-zinc-500"
        >
          {quote.details.quoteType === "ETF" || quote.details.quoteType === "MUTUALFUND"
            ? "برای صندوق‌ها و ETFها معمولاً خبر اختصاصی منتشر نمی‌شود؛ خبر تازه‌ای هم برای این نماد پیدا نشد."
            : "خبر تازه‌ای درباره‌ی این نماد پیدا نشد."}
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
                dir="rtl"
                className="group block text-[12px] font-medium leading-relaxed text-zinc-800 transition hover:text-emerald-700"
              >
                {item.titleFa ?? item.title}
              </a>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  {item.publisher ? <span dir="ltr">{item.publisher}</span> : null}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </span>
                <span>{timeAgoFa(item.publishedAt)}</span>
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
        چرا این امتیاز
      </h3>
      {drivers.length === 0 ? (
        <p
          dir="rtl"
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-500"
        >
          داده‌ی بنیادی برای این نماد وجود ندارد؛ ETFها و صندوق‌ها این معیارها را گزارش
          نمی‌کنند، پس امتیاز بنیادی برای آن‌ها معنی ندارد.
        </p>
      ) : (
        <div className="space-y-1.5">
          {drivers.map((driver) => (
            <div
              key={driver.key}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2"
              dir="rtl"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-zinc-700">
                  {driverLabels[driver.key] ?? driver.label}
                </p>
                <p className="text-[10px] text-zinc-400">
                  {driverDetails[driver.detail] ?? driver.detail}
                </p>
              </div>
              <span
                dir="ltr"
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

export function StockDetails({ quote }: { quote: StockQuote }) {
  const d = quote.details;
  const tags = [d.quoteType, d.sector, d.industry].filter(
    (tag): tag is string => Boolean(tag),
  );

  return (
    <div className="border-t border-zinc-100 pt-3">
      {tags.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <span
              key={tag}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                index === 1
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <NewsPanel quote={quote} />
      <ScoreBreakdown quote={quote} />
    </div>
  );
}
